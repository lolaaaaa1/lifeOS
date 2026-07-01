from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from datetime import date, timedelta
import csv, calendar as cal

MONTH_MAP = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}

def weeks_in_period(year: int, month: int) -> int:
    """ISO weeks whose Thursday falls in this calendar month."""
    first = date(year, month, 1)
    days_to_thu = (3 - first.weekday()) % 7
    thu = first + timedelta(days=days_to_thu)
    count = 0
    while thu.month == month and thu.year == year:
        count += 1
        thu += timedelta(weeks=1)
    return count

app = FastAPI(title="lifeOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ──────────────────────────────────────────────────────────────────────

FRONTEND    = Path(__file__).parent.parent / "frontend_web"
DATA_DIR    = Path(__file__).parent.parent / "data"
FINANCE_CSV = DATA_DIR / "financeOS.csv"
INCOME_CSV  = DATA_DIR / "income.csv"
DAYS_CSV    = DATA_DIR / "days.csv"

DATA_DIR.mkdir(exist_ok=True)

# financeOS.csv is calendar-only
FINANCE_FIELDS = ["Month", "Year", "ActualNumberOfDays", "PersonalFinanceNumberOfWeeks"]
# income.csv holds all financial data
INCOME_FIELDS  = ["Month", "Year", "Type", "Items", "IncomePeriod", "Amount", "CalculatedType"]

DAYS_META_COLS = {"Day", "Month", "Year", "DayName", "MonthYearToUse"}
DAYS_DAYS      = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def read_days() -> tuple[list[str], list[dict]]:
    if not DAYS_CSV.exists():
        return [], []
    with open(DAYS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or [])
        rows   = list(reader)
    return fields, rows

def write_days(fields: list[str], rows: list[dict]):
    with open(DAYS_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

def days_item_cols(fields: list[str]) -> list[str]:
    return [f for f in fields if f not in DAYS_META_COLS]

def portion_col(name: str) -> str:
    """'Company Bonus' → 'CompanyBonusPortion'"""
    return name.replace(" ", "") + "Portion"

# ── Serve frontend_web ─────────────────────────────────────────────────────────

@app.get("/")
def serve_index():
    return FileResponse(FRONTEND / "index.html")

if (FRONTEND / "static").exists():
    app.mount("/static", StaticFiles(directory=FRONTEND / "static"), name="static")


# ── financeOS.csv helpers (calendar metadata only) ────────────────────────────

def read_finance() -> tuple[list[str], list[dict]]:
    if not FINANCE_CSV.exists():
        return FINANCE_FIELDS[:], []
    with open(FINANCE_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or FINANCE_FIELDS)
        rows   = list(reader)

    changed = False
    for col in ("ActualNumberOfDays", "PersonalFinanceNumberOfWeeks"):
        if col not in fields:
            fields.insert(2, col)
            changed = True

    for row in rows:
        m, y = row.get("Month", ""), row.get("Year", "")
        if m in MONTH_MAP and y.isdigit():
            yr, mo = int(y), MONTH_MAP[m]
            if not row.get("ActualNumberOfDays"):
                row["ActualNumberOfDays"] = str(cal.monthrange(yr, mo)[1])
                changed = True
            if not row.get("PersonalFinanceNumberOfWeeks"):
                row["PersonalFinanceNumberOfWeeks"] = str(weeks_in_period(yr, mo))
                changed = True

    if changed:
        write_finance(fields, rows)
    return fields, rows

def write_finance(fields: list[str], rows: list[dict]):
    DATA_DIR.mkdir(exist_ok=True)
    with open(FINANCE_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


# ── income.csv helpers ────────────────────────────────────────────────────────

def read_income() -> tuple[list[str], list[dict]]:
    if not INCOME_CSV.exists():
        return INCOME_FIELDS[:], []
    with open(INCOME_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or INCOME_FIELDS)
        rows   = list(reader)

    changed = False
    if "Incomes" in fields and "Items" not in fields:
        fields[fields.index("Incomes")] = "Items"
        for row in rows:
            row["Items"] = row.pop("Incomes", "")
        changed = True
    for col in ("Type", "Items", "IncomePeriod", "Amount", "CalculatedType"):
        if col not in fields:
            fields.append(col)
            for row in rows:
                row.setdefault(col, "Income" if col == "Type" else "")
            changed = True
    # auto-create a Portion column for every unique Income item
    for row in rows:
        if row.get("Type") == "Income" and row.get("Items"):
            col = portion_col(row["Items"])
            if col not in fields:
                fields.append(col)
                for r in rows:
                    r.setdefault(col, "")
                changed = True
    # migrate: Budget rows that have Amount but not SalaryPortion → move to SalaryPortion
    if "SalaryPortion" in fields:
        for row in rows:
            if (row.get("Type") == "Budget"
                    and row.get("Amount") and not row.get("SalaryPortion")):
                row["SalaryPortion"] = row["Amount"]
                row["Amount"] = ""
                changed = True
    if changed:
        write_income(fields, rows)
    return fields, rows

def write_income(fields: list[str], rows: list[dict]):
    DATA_DIR.mkdir(exist_ok=True)
    with open(INCOME_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


# ── Calendar endpoints ────────────────────────────────────────────────────────

@app.get("/api/finance/months")
def get_months():
    _, rows = read_finance()
    return rows

@app.get("/api/finance/months/{month}/{year}")
def get_month(month: str, year: int):
    _, rows = read_finance()
    for row in rows:
        if row["Month"] == month and int(row["Year"]) == year:
            return row
    return {}


# ── Budget item definitions (derived from income.csv Budget rows) ─────────────

def all_budget_item_names() -> list[str]:
    """Unique budget item names across all months in income.csv."""
    _, rows = read_income()
    seen, result = set(), []
    for r in rows:
        if r.get("Type") == "Budget" and r["Items"] and r["Items"] not in seen:
            seen.add(r["Items"])
            result.append(r["Items"])
    return result

def ensure_budget_rows_for_item(name: str, fields: list[str], rows: list[dict]):
    """Add Budget rows for every known month if missing."""
    _, months = read_finance()
    existing = {(r["Month"], r["Year"]) for r in rows
                if r.get("Type") == "Budget" and r["Items"] == name}
    for m in months:
        key = (m["Month"], m["Year"])
        if key not in existing:
            new_row = {f: "" for f in fields}
            new_row.update({"Month": m["Month"], "Year": m["Year"], "Type": "Budget", "Items": name})
            rows.append(new_row)

@app.get("/api/budget/items")
def get_budget_items():
    return [{"name": n} for n in all_budget_item_names()]

@app.get("/api/income/sources")
def get_income_sources():
    """Return item names with Section=Income from items.csv."""
    _, rows = read_items()
    return [r["ItemName"] for r in rows if r.get("Section") == "Income"]

@app.post("/api/budget/items")
async def create_budget_item(request: Request):
    body = await request.json()
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "name required")
    fields, rows = read_income()
    if any(r.get("Type") == "Budget" and r["Items"] == name for r in rows):
        raise HTTPException(409, "item already exists")
    ensure_budget_rows_for_item(name, fields, rows)
    write_income(fields, rows)
    ifields, irows = read_items()
    if not any(r["ItemName"] == name for r in irows):
        irows.append({"ItemName": name, "Section": "Budget"})
        write_items(ifields, irows)
    return {"name": name}

@app.put("/api/budget/items/{old_name}")
async def rename_budget_item(old_name: str, request: Request):
    body = await request.json()
    new_name = body.get("name", "").strip()
    if not new_name:
        raise HTTPException(400, "name required")
    fields, rows = read_income()
    for row in rows:
        if row.get("Type") == "Budget" and row["Items"] == old_name:
            row["Items"] = new_name
    write_income(fields, rows)
    return {"ok": True}

@app.delete("/api/budget/items/{name}")
def delete_budget_item(name: str):
    fields, rows = read_income()
    new_rows = [r for r in rows if not (r.get("Type") == "Budget" and r["Items"] == name)]
    write_income(fields, new_rows)
    return {"ok": True}


# ── Budget amount endpoints ───────────────────────────────────────────────────

@app.put("/api/finance/months/{month}/{year}/budget")
async def update_month_budget(month: str, year: int, request: Request):
    """Update Budget row Amounts for a month in income.csv."""
    body = await request.json()
    fields, rows = read_income()
    for name, amount in body.items():
        found = False
        for row in rows:
            if (row["Month"] == month and int(row["Year"]) == year
                    and row.get("Type") == "Budget" and row["Items"] == name):
                row["SalaryPortion"] = str(amount)
                row["Amount"] = ""
                found = True
                break
        if not found:
            new_row = {f: "" for f in fields}
            new_row.update({"Month": month, "Year": str(year), "Type": "Budget",
                            "Items": name, "SalaryPortion": str(amount)})
            rows.append(new_row)
    write_income(fields, rows)
    return {"ok": True}

@app.get("/api/budget-meta/{month}/{year}")
def get_budget_meta(month: str, year: int):
    _, rows = read_income()
    return {r["Items"]: r.get("CalculatedType", "")
            for r in rows
            if r["Month"] == month and int(r["Year"]) == year and r.get("Type") == "Budget"}

@app.put("/api/budget-meta/{month}/{year}/{name}")
async def set_budget_meta(month: str, year: int, name: str, request: Request):
    body = await request.json()
    calc_type = body.get("calculatedType", "").strip()
    fields, rows = read_income()
    for row in rows:
        if (row["Month"] == month and int(row["Year"]) == year
                and row.get("Type") == "Budget" and row["Items"] == name):
            row["CalculatedType"] = calc_type
            write_income(fields, rows)
            return {"ok": True}
    new_row = {f: "" for f in fields}
    new_row.update({"Month": month, "Year": str(year), "Type": "Budget",
                    "Items": name, "CalculatedType": calc_type})
    rows.append(new_row)
    write_income(fields, rows)
    return {"ok": True}


# ── Master items list ─────────────────────────────────────────────────────────

ITEMS_CSV    = DATA_DIR / "items.csv"
ITEMS_FIELDS = ["ItemName", "Section", "AccountType"]

def read_items():
    if not ITEMS_CSV.exists():
        return ITEMS_FIELDS[:], []
    with open(ITEMS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or ITEMS_FIELDS)
        rows   = list(reader)
    changed = False
    if "AccountType" not in fields:
        fields.append("AccountType")
        for r in rows: r.setdefault("AccountType", "")
        changed = True
    if changed:
        write_items(fields, rows)
    return fields, rows

def write_items(fields, rows):
    DATA_DIR.mkdir(exist_ok=True)
    with open(ITEMS_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

@app.get("/api/items")
def get_items():
    _, rows = read_items()
    return rows

@app.post("/api/items")
async def add_item(request: Request):
    body        = await request.json()
    name        = body.get("itemName", "").strip()
    section     = body.get("section", "Budget").strip()
    acct_type   = body.get("accountType", "").strip()
    if not name:
        raise HTTPException(400, "itemName required")
    fields, rows = read_items()
    if any(r["ItemName"] == name for r in rows):
        raise HTTPException(409, "item already exists")
    rows.append({"ItemName": name, "Section": section, "AccountType": acct_type})
    write_items(fields, rows)
    return {"ok": True}

@app.put("/api/items/{item_name}")
async def update_item(item_name: str, request: Request):
    body      = await request.json()
    new_name  = body.get("itemName", item_name).strip()
    fields, rows = read_items()
    for row in rows:
        if row["ItemName"] == item_name:
            row["ItemName"]    = new_name
            row["Section"]     = body.get("section", row["Section"])
            row["AccountType"] = body.get("accountType", row.get("AccountType", ""))
            write_items(fields, rows)
            return {"ok": True}
    raise HTTPException(404, "item not found")

@app.delete("/api/items/{item_name}")
def delete_item(item_name: str):
    fields, rows = read_items()
    write_items(fields, [r for r in rows if r["ItemName"] != item_name])
    return {"ok": True}

# ── Income source endpoints ───────────────────────────────────────────────────

@app.get("/api/income/{month}/{year}")
def get_income_for_month(month: str, year: int):
    _, rows = read_income()
    return [r for r in rows if r["Month"] == month and int(r["Year"]) == year]

@app.get("/api/income/year/{year}/totals")
def get_income_year_totals(year: int):
    _, rows = read_income()
    year_rows = [r for r in rows if int(r["Year"]) == year and r.get("Type") == "Budget"]
    totals: dict[str, float] = {}
    for row in year_rows:
        item = row.get("Items", "")
        if not item:
            continue
        if row.get("CalculatedType") == "Calculated":
            continue
        raw = row.get("SalaryPortion", "")
        totals[item] = totals.get(item, 0.0) + (float(raw) if raw else 0.0)
    return totals

@app.post("/api/income/{month}/{year}")
async def add_income_source(month: str, year: int, request: Request):
    body   = await request.json()
    name   = body.get("name", "").strip()
    period = body.get("period", "Monthly").strip()
    if not name:
        raise HTTPException(400, "name required")
    fields, rows = read_income()
    for row in rows:
        if (row["Month"] == month and int(row["Year"]) == year
                and row.get("Type") == "Income" and row["Items"] == name):
            raise HTTPException(409, "already exists for this month")
    col = portion_col(name)
    if col not in fields:
        fields.append(col)
        for row in rows:
            row.setdefault(col, "")
    new_row = {f: "" for f in fields}
    new_row.update({"Month": month, "Year": str(year), "Type": "Income",
                    "Items": name, "IncomePeriod": period})
    rows.append(new_row)
    write_income(fields, rows)
    # add to master items list if not already there
    ifields, irows = read_items()
    if not any(r["ItemName"] == name for r in irows):
        irows.append({"ItemName": name, "Section": "Income"})
        write_items(ifields, irows)
    return {"ok": True}

@app.put("/api/income/{month}/{year}/{name}")
async def update_income_amount(month: str, year: int, name: str, request: Request):
    body   = await request.json()
    amount = str(body.get("amount", ""))
    fields, rows = read_income()
    for row in rows:
        if (row["Month"] == month and int(row["Year"]) == year
                and row.get("Type") == "Income" and row["Items"] == name):
            row["Amount"] = amount
            write_income(fields, rows)
            return {"ok": True}
    raise HTTPException(404, "income source not found")

@app.put("/api/income/{month}/{year}/{name}/portion")
async def update_income_portion(month: str, year: int, name: str, request: Request):
    """Save the Portion amount on the Income row for this source."""
    body   = await request.json()
    amount = str(body.get("amount", ""))
    col    = portion_col(name)
    fields, rows = read_income()
    if col not in fields:
        fields.append(col)
        for r in rows:
            r.setdefault(col, "")
    for row in rows:
        if (row["Month"] == month and int(row["Year"]) == year
                and row.get("Type") == "Income" and row["Items"] == name):
            row[col] = amount
            write_income(fields, rows)
            return {"ok": True}
    raise HTTPException(404, "income source not found")

@app.put("/api/income/{month}/{year}/{name}/meta")
async def update_income_meta(month: str, year: int, name: str, request: Request):
    body       = await request.json()
    new_name   = body.get("name", name).strip() or name
    new_period = body.get("period", "").strip()
    fields, rows = read_income()
    for row in rows:
        if (row["Month"] == month and int(row["Year"]) == year
                and row.get("Type") == "Income" and row["Items"] == name):
            row["Items"] = new_name
            if new_period:
                row["IncomePeriod"] = new_period
            write_income(fields, rows)
            return {"ok": True}
    raise HTTPException(404, "not found")

@app.delete("/api/income/{month}/{year}/{name}")
def delete_income_source(month: str, year: int, name: str):
    fields, rows = read_income()
    new_rows = [r for r in rows
                if not (r["Month"] == month and int(r["Year"]) == year
                        and r.get("Type") == "Income" and r["Items"] == name)]
    write_income(fields, new_rows)
    return {"ok": True}


# ── days.csv endpoints ────────────────────────────────────────────────────────

def income_source_prefixes() -> list[str]:
    """Return normalized source name prefixes from items.csv (Section=Income), longest first."""
    _, rows = read_items()
    prefixes = [r["ItemName"].replace(" ", "") for r in rows if r.get("Section") == "Income"]
    return sorted(prefixes, key=len, reverse=True)

def col_to_item(col: str, prefixes: list[str]) -> str | None:
    """'SalaryFood' -> 'Food' given prefix 'Salary'. Returns None if no prefix matches."""
    for p in prefixes:
        if col.startswith(p):
            return col[len(p):]
    return None

@app.get("/api/days/on/{date_str}")
def get_day_amounts(date_str: str):
    """Daily amounts for a specific date (YYYY-MM-DD or 'today')."""
    from datetime import date as date_cls, datetime
    MONTHS = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"]
    try:
        target = date_cls.today() if date_str == "today" else datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    fields, rows = read_days()
    prefixes  = income_source_prefixes()
    item_cols = days_item_cols(fields)
    amounts: dict[str, float] = {}
    for row in rows:
        try:
            r_date = date_cls(int(row["Year"]), MONTHS.index(row["Month"]) + 1, int(row["Day"]))
        except (ValueError, KeyError):
            continue
        if r_date == target:
            for col in item_cols:
                item = col_to_item(col, prefixes)
                if item:
                    amounts[item] = amounts.get(item, 0) + float(row.get(col) or 0)
            break
    return {
        "date":    target.strftime("%Y-%m-%d"),
        "dayName": target.strftime("%A"),
        "amounts": amounts,
    }

@app.get("/api/days/today/summary")
def get_days_today_summary():
    """Daily, period, and yearly totals for Calculated budget items based on today's date."""
    from datetime import date
    today = date.today()
    today_str = today.strftime("%Y-%m-%d")

    fields, rows = read_days()
    prefixes  = income_source_prefixes()
    item_cols = days_item_cols(fields)

    daily: dict[str, float]  = {}
    period_name: str         = ""
    period_totals: dict[str, float] = {}
    yearly_totals: dict[str, float] = {}

    for row in rows:
        try:
            row_day   = int(row["Day"])
            row_month = row["Month"]
            row_year  = int(row["Year"])
        except (ValueError, KeyError):
            continue

        # map month name to number
        MONTHS = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"]
        try:
            month_num = MONTHS.index(row_month) + 1
        except ValueError:
            continue

        row_date = date(row_year, month_num, row_day)

        # daily: today's row
        if row_date == today:
            period_name = row.get("MonthYearToUse", "")
            for col in item_cols:
                item = col_to_item(col, prefixes)
                if item:
                    daily[item] = daily.get(item, 0) + float(row.get(col) or 0)

        # period totals: rows whose MonthYearToUse matches today's period
        # (collected after we know period_name — second pass below)

        # yearly totals: all rows in today's calendar year
        if row_year == today.year:
            for col in item_cols:
                item = col_to_item(col, prefixes)
                if item:
                    yearly_totals[item] = yearly_totals.get(item, 0) + float(row.get(col) or 0)

    # second pass for period totals (now that period_name is known)
    if period_name:
        for row in rows:
            if row.get("MonthYearToUse") == period_name:
                for col in item_cols:
                    item = col_to_item(col, prefixes)
                    if item:
                        period_totals[item] = period_totals.get(item, 0) + float(row.get(col) or 0)

    # period budget: all budget items (Calculated from days.csv + Actual from income.csv)
    period_budget: dict[str, float] = dict(period_totals)  # start with Calculated totals
    if period_name:
        try:
            p_month, p_year_str = period_name.rsplit(" ", 1)
            p_year = int(p_year_str)
            _, inc_rows = read_income()
            for row in inc_rows:
                if (row.get("Month") == p_month
                        and str(row.get("Year", "")) == str(p_year)
                        and row.get("Type") == "Budget"
                        and (row.get("CalculatedType") or "") != "Calculated"):
                    item = row.get("Items", "")
                    raw  = row.get("SalaryPortion", "")
                    if item:
                        period_budget[item] = float(raw) if raw else 0
        except (ValueError, AttributeError):
            pass

    return {
        "date":         today_str,
        "period":       period_name,
        "daily":        daily,
        "periodBudget": period_budget,
        "yearlyTotals": yearly_totals,
    }

@app.get("/api/days/{month}/{year}/totals")
def get_days_totals(month: str, year: int):
    """Sum days.csv budget columns for MonthYearToUse period, aggregated by item name."""
    period   = f"{month} {year}"
    fields, rows = read_days()
    prefixes = income_source_prefixes()
    item_cols = days_item_cols(fields)
    totals: dict[str, float] = {}
    for row in rows:
        if row.get("MonthYearToUse") == period:
            for col in item_cols:
                item = col_to_item(col, prefixes)
                if item:
                    totals[item] = totals.get(item, 0) + float(row.get(col) or 0)
    return totals

@app.get("/api/days/{month}/{year}/{name}/amounts")
def get_days_item_amounts(month: str, year: int, name: str):
    """Return per-weekday amount and applies for an item in a calendar month."""
    _, income_rows = read_income()
    fields, days_rows = read_days()
    # find the actual column for this item (e.g. 'SalaryFood' for 'Food')
    prefixes  = income_source_prefixes()
    item_cols = days_item_cols(fields)
    col_name  = next((c for c in item_cols if col_to_item(c, prefixes) == name), name)
    # per-weekday amounts: read first occurrence of each weekday in the calendar month
    amounts = {}
    for row in days_rows:
        if row["Month"] == month and int(row["Year"]) == year:
            dn = row["DayName"]
            if dn not in amounts:
                amounts[dn] = float(row.get(col_name) or 0)
    # applies from income.csv
    applies = {d: True for d in DAYS_DAYS}
    for row in income_rows:
        if (row["Month"] == month and int(row["Year"]) == year
                and row.get("Type") == "Budget" and row["Items"] == name):
            for d in DAYS_DAYS:
                val = row.get(f"{d}Applies", "")
                if str(val).lower() == "false":
                    applies[d] = False
            break
    return {d: {"amount": amounts.get(d, 0), "applies": applies[d]} for d in DAYS_DAYS}


# ── Budget daily amounts endpoint ─────────────────────────────────────────────

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

@app.put("/api/income/{month}/{year}/budget/{name}/daily")
async def update_budget_daily(month: str, year: int, name: str, request: Request):
    body = await request.json()

    # 1. Update applies columns in income.csv (no longer stores amounts)
    fields, rows = read_income()
    for day in DAYS:
        col = f"{day}Applies"
        if col not in fields:
            fields.append(col)
            for r in rows:
                r.setdefault(col, "")
    for row in rows:
        if (row["Month"] == month and int(row["Year"]) == year
                and row.get("Type") == "Budget" and row["Items"] == name):
            for day in DAYS:
                applies = body.get(f"{day.lower()}_applies", True)
                row[f"{day}Applies"] = "true" if applies else "false"
            write_income(fields, rows)
            break

    # 2. Write per-day amounts into days.csv for this calendar month
    dfields, drows = read_days()
    # determine the source-prefixed column name for this item
    prefixes  = income_source_prefixes()
    item_cols = days_item_cols(dfields)
    col_name  = next((c for c in item_cols if col_to_item(c, prefixes) == name), None)
    if col_name is None:
        # create a new column using the first Monthly income source as prefix
        _, irows = read_income()
        primary = next((r["Items"].replace(" ", "") for r in irows
                        if r.get("Type") == "Income" and r.get("IncomePeriod") == "Monthly"), "")
        col_name = (primary + name) if primary else name
    if col_name not in dfields:
        dfields.append(col_name)
        for r in drows:
            r.setdefault(col_name, "")
    for row in drows:
        if row["Month"] == month and int(row["Year"]) == year:
            dn = row["DayName"]
            applies = body.get(f"{dn.lower()}_applies", True)
            amt     = body.get(dn.lower(), "") if applies else ""
            row[col_name] = str(amt) if amt != "" else ""
    write_days(dfields, drows)

    # 3. Total = sum of all source columns for this item in the MonthYearToUse period
    period = f"{month} {year}"
    item_cols_new = days_item_cols(dfields)
    total = sum(
        float(r.get(c) or 0)
        for r in drows if r.get("MonthYearToUse") == period
        for c in item_cols_new if col_to_item(c, prefixes) == name
    )
    return {"ok": True, "total": total}


# ── Account definitions — derived from items.csv (Section=Accounts) ───────────

def read_account_defs():
    """Return account defs as [{AccountName, Type}] derived from items.csv."""
    _, rows = read_items()
    return [{"AccountName": r["ItemName"], "Type": r.get("AccountType", "")}
            for r in rows if r.get("Section") == "Accounts"]

@app.get("/api/account-defs")
def get_account_defs():
    return read_account_defs()

@app.post("/api/account-defs")
async def create_account_def(request: Request):
    body  = await request.json()
    name  = body.get("accountName", "").strip()
    atype = body.get("type", "Bank").strip()
    if not name:
        raise HTTPException(400, "accountName required")
    fields, rows = read_items()
    if any(r["ItemName"] == name and r.get("Section") == "Accounts" for r in rows):
        raise HTTPException(409, "account already exists")
    rows.append({"ItemName": name, "Section": "Accounts", "AccountType": atype})
    write_items(fields, rows)
    return {"ok": True}

@app.put("/api/account-defs/{account_name}")
async def update_account_def(account_name: str, request: Request):
    body     = await request.json()
    new_name = body.get("accountName", account_name).strip()
    new_type = body.get("type", "").strip()
    fields, rows = read_items()
    for row in rows:
        if row["ItemName"] == account_name and row.get("Section") == "Accounts":
            row["ItemName"]    = new_name
            if new_type:
                row["AccountType"] = new_type
            write_items(fields, rows)
            if new_name != account_name:
                tf, tr = read_accounts()
                for t in tr:
                    if t["AccountName"] == account_name:
                        t["AccountName"] = new_name
                write_accounts(tf, tr)
            return {"ok": True}
    raise HTTPException(404, "account not found")

@app.delete("/api/account-defs/{account_name}")
def delete_account_def(account_name: str):
    fields, rows = read_items()
    write_items(fields, [r for r in rows
                         if not (r["ItemName"] == account_name and r.get("Section") == "Accounts")])
    tf, tr = read_accounts()
    write_accounts(tf, [r for r in tr if r["AccountName"] != account_name])
    return {"ok": True}

# ── Account transactions ──────────────────────────────────────────────────────

ACCOUNTS_CSV    = DATA_DIR / "transactions.csv"
ACCOUNTS_FIELDS = ["TransactionID", "AccountName", "Item", "IncomePeriod",
                   "MonthReceived", "YearReceived", "MonthFor", "YearFor", "Credit"]

def generate_transaction_id(rows: list[dict]) -> str:
    today = date.today()
    prefix = today.strftime("%d%m%Y")
    existing = {r.get("TransactionID", "") for r in rows}
    for seq in range(1, 1000):
        tid = f"{prefix}{seq:02d}"
        if tid not in existing:
            return tid
    return f"{prefix}99"

def get_income_sync_items() -> set:
    """Return item names whose Section=Income — these sync to income.csv on transaction save."""
    _, rows = read_items()
    return {r["ItemName"] for r in rows if r.get("Section") == "Income"}

def read_accounts():
    if not ACCOUNTS_CSV.exists():
        return ACCOUNTS_FIELDS[:], []
    with open(ACCOUNTS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or ACCOUNTS_FIELDS)
        rows   = list(reader)
    changed = False
    # rename IncomeTransaction → Item
    if "IncomeTransaction" in fields and "Item" not in fields:
        idx = fields.index("IncomeTransaction")
        fields[idx] = "Item"
        for r in rows: r["Item"] = r.pop("IncomeTransaction", "")
        changed = True
    # normalise YearFor
    for r in rows:
        if not r.get("YearFor") and r.get("Yearfor"):
            r["YearFor"] = r.pop("Yearfor")
            changed = True
    # ensure all canonical columns exist
    for col in ACCOUNTS_FIELDS:
        if col not in fields:
            fields.append(col)
            for r in rows: r.setdefault(col, "")
            changed = True
    # remove stale columns (Type now lives only in account_defs)
    for stale in ("Type", "Balance", "Month", "Year", "IncomeTransaction", "Yearfor"):
        if stale in fields:
            fields.remove(stale)
            for r in rows: r.pop(stale, None)
            changed = True
    if changed:
        write_accounts(fields, rows)
    return fields, rows

def write_accounts(fields, rows):
    DATA_DIR.mkdir(exist_ok=True)
    with open(ACCOUNTS_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

def sync_account_to_income(item: str, month_received: str, year_received: str,
                            credit: float, income_period: str = ""):
    if not (month_received and year_received and item):
        return
    fields, rows = read_income()
    changed = False
    for row in rows:
        if (row.get("Month") == month_received
                and str(row.get("Year", "")) == str(year_received)
                and row.get("Type") == "Income"
                and row.get("Items") == item):
            row["Amount"] = str(credit)
            if income_period:
                row["IncomePeriod"] = income_period
            changed = True
    if changed:
        write_income(fields, rows)

@app.get("/api/accounts")
def get_accounts():
    _, rows = read_accounts()
    return rows

@app.post("/api/accounts/transaction")
async def add_account_transaction(request: Request):
    body          = await request.json()
    name          = body.get("accountName", "").strip()
    if not name:
        raise HTTPException(400, "accountName required")
    item          = body.get("item", "").strip()
    month_for     = body.get("monthFor", "").strip()
    year_for      = str(body.get("yearFor", "")).strip()
    credit        = float(body.get("credit", 0) or 0)
    income_period = body.get("incomePeriod", "").strip()

    fields, rows = read_accounts()
    new_row = {f: "" for f in fields}
    new_row.update({
        "TransactionID": generate_transaction_id(rows),
        "AccountName":   name,
        "Item":          item,
        "IncomePeriod":  income_period,
        "MonthReceived": body.get("monthReceived", ""),
        "YearReceived":  str(body.get("yearReceived", "")),
        "MonthFor":      month_for,
        "YearFor":       year_for,
        "Credit":        str(credit),
    })
    rows.append(new_row)
    write_accounts(fields, rows)
    month_received = new_row["MonthReceived"]
    year_received  = new_row["YearReceived"]
    if item in get_income_sync_items():
        sync_account_to_income(item, month_received, year_received, credit, income_period)
    return {"ok": True}

@app.put("/api/accounts/transaction")
async def update_account_transaction(request: Request):
    body          = await request.json()
    txn_id        = body.get("transactionId", "").strip()
    acct          = body.get("accountName", "").strip()
    item          = body.get("item", "").strip()
    month_for     = body.get("monthFor", "").strip()
    year_for      = str(body.get("yearFor", "")).strip()
    income_period = body.get("incomePeriod", "").strip()

    fields, rows = read_accounts()
    for row in rows:
        match = (txn_id and row.get("TransactionID") == txn_id)
        if not match:
            # fallback: match by old fields for rows without ID
            old_acct      = body.get("oldAccountName", acct).strip()
            old_item      = body.get("oldItem", item).strip()
            old_month_for = body.get("oldMonthFor", month_for).strip()
            old_year_for  = str(body.get("oldYearFor", year_for)).strip()
            row_yr = row.get("YearFor") or row.get("Yearfor", "")
            match = (row["AccountName"] == old_acct and row.get("Item", "") == old_item
                     and row.get("MonthFor", "") == old_month_for and row_yr == old_year_for)
        if match:
            row["AccountName"]   = acct
            row["Item"]          = item
            row["MonthFor"]      = month_for
            row["YearFor"]       = year_for
            row["Credit"]        = str(float(body.get("credit", row.get("Credit", 0)) or 0))
            row["IncomePeriod"]  = income_period or row.get("IncomePeriod", "")
            row["MonthReceived"] = body.get("monthReceived", row.get("MonthReceived", ""))
            row["YearReceived"]  = str(body.get("yearReceived", row.get("YearReceived", "")))
            write_accounts(fields, rows)
            if item in get_income_sync_items():
                sync_account_to_income(item, row["MonthReceived"], row["YearReceived"],
                                       float(row["Credit"]), income_period)
            return {"ok": True}
    raise HTTPException(404, "transaction not found")

@app.delete("/api/accounts/transaction/{transaction_id}")
def delete_account_transaction_by_id(transaction_id: str):
    fields, rows = read_accounts()
    new_rows = [r for r in rows if r.get("TransactionID", "") != transaction_id]
    write_accounts(fields, new_rows)
    return {"ok": True}

@app.delete("/api/accounts/{account_name}/transaction/{item}/{month_for}/{year_for}")
def delete_account_transaction(account_name: str, item: str, month_for: str, year_for: str):
    fields, rows = read_accounts()
    new_rows = [r for r in rows if not (
        r["AccountName"] == account_name
        and r.get("Item", "") == item
        and r.get("MonthFor", "") == month_for
        and (r.get("YearFor", "") == year_for or r.get("Yearfor", "") == year_for)
    )]
    write_accounts(fields, new_rows)
    return {"ok": True}


# ── Generic CSV endpoints ─────────────────────────────────────────────────────

@app.get("/api/csv/{filename}", response_class=PlainTextResponse)
def get_csv(filename: str):
    path = DATA_DIR / f"{filename}.csv"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")

@app.post("/api/csv/{filename}")
async def post_csv(filename: str, request: Request):
    path = DATA_DIR / f"{filename}.csv"
    body = await request.body()
    path.write_text(body.decode("utf-8"), encoding="utf-8")
    return {"ok": True}
