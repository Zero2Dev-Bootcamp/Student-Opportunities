erDiagram
    USER ||--o{ OPPORTUNITY : "offers (as company)"
    USER ||--o{ APPLICATION : "submits (as student)"
    USER ||--o{ NOTIFICATION : "receives"
    OPPORTUNITY ||--o{ APPLICATION : "has"
    OPPORTUNITY }o--|| USER : "offered by"
    APPLICATION }|--|| USER : "submitted by"
    APPLICATION }|--|| OPPORTUNITY : "is for"
    NOTIFICATION }|--|| USER : "belongs to"

    USER {
        INTEGER id PK "Auto-increment"
        TEXT name "NOT NULL"
        TEXT email "UNIQUE, NOT NULL"
        TEXT password_hash "NOT NULL"
        TEXT user_type "NOT NULL (student or company)"
        TEXT major "Nullable (for students)"
        INTEGER graduation_year "Nullable (for students)"
        TEXT industry "Nullable (for companies)"
        TEXT location "Nullable"
        TEXT description "Nullable"
    }

    OPPORTUNITY {
        INTEGER id PK "Auto-increment"
        TEXT title "NOT NULL"
        TEXT description "NOT NULL"
        TEXT type "NOT NULL (Internship, Job, etc.)"
        INTEGER company_user_id FK "Ref User(id), ON DELETE SET NULL"
        TEXT location "Nullable"
        DATE deadline "Nullable"
        TEXT link "Nullable"
        DATETIME posted_date "DEFAULT CURRENT_TIMESTAMP"
        TEXT required_skills "Nullable"
        REAL stipend "Nullable"
        TEXT duration "Nullable"
    }

    APPLICATION {
        INTEGER id PK "Auto-increment"
        INTEGER student_user_id FK "Ref User(id), NOT NULL, ON DELETE CASCADE"
        INTEGER opportunity_id FK "Ref Opportunity(id), NOT NULL, ON DELETE CASCADE"
        DATETIME application_date "DEFAULT CURRENT_TIMESTAMP"
        TEXT status "NOT NULL, DEFAULT 'Submitted' (Submitted, Reviewed, etc.)"
        TEXT notes "Nullable"
    }

    NOTIFICATION {
        INTEGER id PK "Auto-increment"
        INTEGER user_id FK "Ref User(id), NOT NULL, ON DELETE CASCADE"
        TEXT message "NOT NULL"
        TEXT type "Nullable"
        BOOLEAN is_read "DEFAULT 0"
        DATETIME created_at "DEFAULT CURRENT_TIMESTAMP"
        TEXT related_entity_type "Nullable"
        INTEGER related_entity_id "Nullable"
    }
