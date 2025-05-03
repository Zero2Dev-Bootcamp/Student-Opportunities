# Entity Relationship Diagram (ERD)

This diagram visualizes the relationships between the database tables defined in `db/db.js`.

```mermaid
erDiagram
    Student ||--o{ Application : "applies for (0..N)"
    Opportunity ||--o{ Application : "receives (0..N)"
    Company ||--o{ Opportunity : "offers (0..N)"
    Opportunity }o--|| Company : "belongs to (0..1)"

    Student {
        INTEGER id PK "Auto-increment"
        TEXT name "NOT NULL"
        TEXT email "UNIQUE, NOT NULL"
        TEXT password_hash "NOT NULL"
        TEXT major
        INTEGER graduation_year
    }

    Company {
        INTEGER id PK "Auto-increment"
        TEXT name "UNIQUE, NOT NULL"
        TEXT industry
        TEXT location
        TEXT description
    }

    Opportunity {
        INTEGER id PK "Auto-increment"
        TEXT title "NOT NULL"
        TEXT description "NOT NULL"
        TEXT type "NOT NULL, CHECK(type IN ('Internship', 'Job', 'Scholarship', 'Volunteer', 'Other'))"
        INTEGER company_id FK "Ref Company(id), ON DELETE SET NULL"
        TEXT location
        DATE deadline
        TEXT link
        DATETIME posted_date "DEFAULT CURRENT_TIMESTAMP"
        TEXT required_skills
        REAL stipend
        TEXT duration
    }

    Application {
        INTEGER id PK "Auto-increment"
        INTEGER student_id FK "Ref Student(id), NOT NULL, ON DELETE CASCADE"
        INTEGER opportunity_id FK "Ref Opportunity(id), NOT NULL, ON DELETE CASCADE"
        DATETIME application_date "DEFAULT CURRENT_TIMESTAMP"
        TEXT status "NOT NULL, DEFAULT 'Submitted', CHECK(status IN ('Submitted', 'Reviewed', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn'))"
        TEXT notes
    }
```

**Key:**

*   `PK`: Primary Key
*   `FK`: Foreign Key
*   `UK`: Unique Key
*   `||--o{`: One-to-Many relationship (one side mandatory, many side optional/zero or more)
*   `}o--||`: Many-to-One relationship (many side optional/zero or one, one side mandatory)
*   `(0..N)`: Cardinality (Zero to Many)
*   `(0..1)`: Cardinality (Zero to One)
