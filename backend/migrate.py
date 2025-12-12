import os
from sqlalchemy import create_engine, text

# Get DB URL from env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("No DATABASE_URL set. Skipping migration.")
    exit()

# Fix for SQLAlchemy parsing postgres:// (if Zeabur provides old style)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def run_migration():
    print("Running database migration...")
    with engine.connect() as conn:
        # 1. Add avatar column to user table
        try:
            # Check if column exists is hard in raw SQL cross-db, so we just try to add it.
            # If it fails, we assume it exists.
            # Quote "user" because it is a reserved keyword in Postgres
            print("Attempting to add 'avatar' column to 'user' table...")
            conn.execute(text('ALTER TABLE "user" ADD COLUMN avatar TEXT;'))
            conn.commit()
            print("Successfully added 'avatar' column.")
        except Exception as e:
            # Check if error is because column exists
            if "duplicate column" in str(e) or "no such table" in str(e): 
                 # "no such table" happens if tables haven't been created yet (first run)
                 # In that case, main.py startup will create the table WITH the column.
                print(f"Skipping 'avatar' column addition: {e}")
            else:
                print(f"Migration warning: {e}")

if __name__ == "__main__":
    run_migration()
