const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS citizens (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        national_id  TEXT UNIQUE NOT NULL,
        full_name    TEXT NOT NULL,
        phone        TEXT,
        address      TEXT,
        dob          DATE,
        sector       TEXT DEFAULT 'general'
      );

      CREATE TABLE IF NOT EXISTS services (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug          TEXT UNIQUE NOT NULL,
        name          TEXT NOT NULL,
        sector        TEXT NOT NULL,
        required_docs JSONB DEFAULT '[]',
        form_fields   JSONB DEFAULT '[]',
        is_active     BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        citizen_id        UUID REFERENCES citizens(id),
        token_number      TEXT NOT NULL,
        sector            TEXT NOT NULL,
        raw_input         TEXT,
        detected_services JSONB DEFAULT '[]',
        generated_forms   JSONB DEFAULT '{}',
        doc_checklist     JSONB DEFAULT '[]',
        officer_briefing  TEXT,
        ai_summary        TEXT,
        status            TEXT DEFAULT 'waiting',
        needs_manual_review BOOLEAN DEFAULT false,
        created_at        TIMESTAMPTZ DEFAULT now(),
        served_at         TIMESTAMPTZ,
        completed_at      TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS service_logs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id    UUID REFERENCES tickets(id),
        notes        TEXT,
        completed_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('✅ Migrations complete');
    await seedData(client);
  } finally {
    client.release();
  }
}

async function seedData(client) {
  // Seed citizens
  const citizens = [
    {
      national_id: '1234567890',
      full_name: 'Fatema Begum',
      phone: '+8801711223344',
      address: 'House 12, Road 5, Dhanmondi, Dhaka-1205',
      dob: '1985-03-15',
      sector: 'banking',
    },
    {
      national_id: '0987654321',
      full_name: 'Mohammad Karim',
      phone: '+8801819988776',
      address: 'Flat 3B, Mirpur-10, Dhaka-1216',
      dob: '1978-07-22',
      sector: 'government',
    },
    {
      national_id: '1122334455',
      full_name: 'Rina Akter',
      phone: '+8801955667788',
      address: 'Village: Borogharia, Upazila: Savar, Dhaka',
      dob: '1992-11-08',
      sector: 'general',
    },
    {
      national_id: '5544332211',
      full_name: 'Jamal Uddin',
      phone: '+8801622334455',
      address: 'House 88, Agrabad, Chittagong-4100',
      dob: '1969-05-30',
      sector: 'government',
    },
    {
      national_id: '9988776655',
      full_name: 'Sadia Islam',
      phone: '+8801533445566',
      address: 'Flat 7A, Bashundhara R/A, Block C, Dhaka-1229',
      dob: '1995-09-14',
      sector: 'banking',
    },
  ];

  for (const c of citizens) {
    await client.query(
      `INSERT INTO citizens (national_id, full_name, phone, address, dob, sector)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (national_id) DO NOTHING`,
      [c.national_id, c.full_name, c.phone, c.address, c.dob, c.sector]
    );
  }

  // Seed services
  const services = [
    // Banking
    { slug: 'cash_deposit', name: 'Cash Deposit', sector: 'banking', required_docs: ['National ID', 'Account Number / Passbook'], form_fields: ['account_number', 'amount', 'depositor_name', 'phone'] },
    { slug: 'cash_withdrawal', name: 'Cash Withdrawal', sector: 'banking', required_docs: ['National ID', 'Passbook', 'Withdrawal Slip'], form_fields: ['account_number', 'amount', 'purpose'] },
    { slug: 'fd_open', name: 'Fixed Deposit Opening', sector: 'banking', required_docs: ['National ID', 'Passport Photo (2 copies)', 'Account Statement', 'TIN Certificate'], form_fields: ['account_number', 'fd_amount', 'tenure_months', 'nominee_name', 'nominee_relation'] },
    { slug: 'fd_close', name: 'Fixed Deposit Closure', sector: 'banking', required_docs: ['National ID', 'FD Receipt', 'Passbook'], form_fields: ['fd_receipt_number', 'reason'] },
    { slug: 'fd_renew', name: 'Fixed Deposit Renewal', sector: 'banking', required_docs: ['National ID', 'FD Receipt'], form_fields: ['fd_receipt_number', 'new_tenure_months'] },
    { slug: 'account_open', name: 'Account Opening', sector: 'banking', required_docs: ['National ID', 'Passport Photo (2 copies)', 'Nominee Photo (1 copy)', 'Introducer Signature', 'TIN Certificate (if applicable)'], form_fields: ['account_type', 'initial_deposit', 'nominee_name', 'nominee_relation', 'nominee_nid'] },
    { slug: 'account_close', name: 'Account Closure', sector: 'banking', required_docs: ['National ID', 'Passbook', 'Cheque Book (all unused cheques)'], form_fields: ['account_number', 'reason', 'outstanding_balance_preference'] },
    { slug: 'cheque_book_request', name: 'Cheque Book Request', sector: 'banking', required_docs: ['National ID', 'Passbook'], form_fields: ['account_number', 'leaves_count'] },
    { slug: 'statement_request', name: 'Bank Statement Request', sector: 'banking', required_docs: ['National ID'], form_fields: ['account_number', 'from_date', 'to_date', 'delivery_preference'] },
    { slug: 'loan_inquiry', name: 'Loan Inquiry / Application', sector: 'banking', required_docs: ['National ID', 'Passport Photo', 'Income Proof', 'Bank Statement (6 months)', 'TIN Certificate', 'Property Documents (if secured)'], form_fields: ['loan_type', 'amount_required', 'repayment_tenure', 'employment_type', 'monthly_income'] },
    { slug: 'utility_bill_payment', name: 'Utility Bill Payment', sector: 'banking', required_docs: ['Utility Bill', 'Account Number or Cash'], form_fields: ['bill_type', 'customer_number', 'amount', 'payment_method'] },
    { slug: 'dps_open', name: 'DPS Account Opening', sector: 'banking', required_docs: ['National ID', 'Passport Photo', 'Account Number'], form_fields: ['monthly_installment', 'tenure_months', 'linked_account'] },
    { slug: 'dps_close', name: 'DPS Account Closure', sector: 'banking', required_docs: ['National ID', 'DPS Passbook'], form_fields: ['dps_account_number', 'reason'] },
    { slug: 'pay_order', name: 'Pay Order / Demand Draft', sector: 'banking', required_docs: ['National ID', 'Payment (cash or debit)'], form_fields: ['payee_name', 'amount', 'purpose', 'payee_bank'] },
    { slug: 'card_issue', name: 'Card Issuance', sector: 'banking', required_docs: ['National ID', 'Passport Photo', 'Account Statement'], form_fields: ['card_type', 'account_number'] },
    { slug: 'card_block', name: 'Card Blocking', sector: 'banking', required_docs: ['National ID'], form_fields: ['card_last_four', 'reason', 'report_number_if_stolen'] },
    { slug: 'card_replacement', name: 'Card Replacement', sector: 'banking', required_docs: ['National ID', 'GD Copy (if stolen)'], form_fields: ['card_last_four', 'reason', 'delivery_address'] },
    // Government
    { slug: 'nid_correction', name: 'National ID Correction', sector: 'government', required_docs: ['Birth Certificate', 'SSC Certificate', 'Supporting Documents for correction'], form_fields: ['current_nid', 'field_to_correct', 'correct_value', 'reason'] },
    { slug: 'nid_reissue', name: 'National ID Reissue', sector: 'government', required_docs: ['General Diary (GD) Copy (if lost)', 'Birth Certificate', 'Passport Photo'], form_fields: ['reason', 'gd_number', 'gd_station'] },
    { slug: 'birth_certificate_new', name: 'Birth Certificate (New)', sector: 'government', required_docs: ['Hospital Birth Record / Midwife Certificate', 'Parents NID', 'Parents Marriage Certificate'], form_fields: ['child_name', 'dob', 'father_name', 'mother_name', 'birth_place'] },
    { slug: 'birth_certificate_correction', name: 'Birth Certificate Correction', sector: 'government', required_docs: ['Existing Birth Certificate', 'Supporting Proof Documents', 'School Certificate'], form_fields: ['certificate_number', 'field_to_correct', 'correct_value'] },
    { slug: 'passport_new', name: 'Passport Application (New)', sector: 'government', required_docs: ['National ID', 'Birth Certificate', 'Passport Photo (4 copies)', 'Bank Payment Receipt'], form_fields: ['passport_type', 'delivery_type', 'travel_purpose'] },
    { slug: 'passport_renewal', name: 'Passport Renewal', sector: 'government', required_docs: ['Existing Passport', 'National ID', 'Passport Photo (4 copies)', 'Bank Payment Receipt'], form_fields: ['old_passport_number', 'expiry_date', 'delivery_type', 'any_changes'] },
    { slug: 'passport_correction', name: 'Passport Correction', sector: 'government', required_docs: ['Existing Passport', 'National ID', 'Supporting Documents', 'Passport Photo'], form_fields: ['old_passport_number', 'field_to_correct', 'correct_value'] },
    { slug: 'trade_license_new', name: 'Trade License (New)', sector: 'government', required_docs: ['National ID', 'Passport Photo', 'Business Premises Proof', 'TIN Certificate'], form_fields: ['business_name', 'business_type', 'address', 'annual_turnover_estimate'] },
    { slug: 'trade_license_renewal', name: 'Trade License Renewal', sector: 'government', required_docs: ['Existing Trade License', 'National ID', 'Updated TIN Certificate'], form_fields: ['license_number', 'business_name', 'renewal_period'] },
    { slug: 'land_mutation', name: 'Land Mutation / Record Correction', sector: 'government', required_docs: ['Deed of Sale / Gift Deed', 'NID', 'Mouza Map', 'Khatian Copy', 'Tax Payment Receipt'], form_fields: ['plot_number', 'mouza', 'upazila', 'district', 'previous_owner'] },
    { slug: 'tax_clearance', name: 'Tax Clearance Certificate', sector: 'government', required_docs: ['NID', 'TIN Certificate', 'Last 3 Years Tax Returns', 'Bank Statement'], form_fields: ['tin_number', 'purpose', 'assessment_year'] },
    { slug: 'police_clearance', name: 'Police Clearance Certificate', sector: 'government', required_docs: ['NID', 'Passport', 'Passport Photo (4 copies)', 'Bank Payment Receipt'], form_fields: ['purpose', 'destination_country', 'passport_number'] },
    { slug: 'utility_connection_gas', name: 'Gas Connection (New)', sector: 'government', required_docs: ['NID', 'Land/Property Deed', 'Building Approval Plan', 'Application Form'], form_fields: ['property_address', 'property_type', 'owner_name'] },
    { slug: 'utility_connection_water', name: 'Water Connection (New)', sector: 'government', required_docs: ['NID', 'Land/Property Deed', 'Building Approval Plan'], form_fields: ['property_address', 'property_type', 'connection_size'] },
    { slug: 'utility_connection_electricity', name: 'Electricity Connection (New)', sector: 'government', required_docs: ['NID', 'Land/Property Deed', 'Building Approval Plan', 'Load Assessment'], form_fields: ['property_address', 'load_required_kw', 'connection_type'] },
    { slug: 'marriage_certificate', name: 'Marriage Certificate Registration', sector: 'government', required_docs: ['Both Parties NID', 'Passport Photos', 'Witnesses NID (2)', 'Kazi Office Receipt'], form_fields: ['husband_name', 'husband_nid', 'wife_name', 'wife_nid', 'marriage_date', 'kazi_name'] },
    { slug: 'death_certificate', name: 'Death Certificate', sector: 'government', required_docs: ['Hospital Death Certificate / Doctor Certificate', 'Deceased NID', 'Applicant NID', 'Relation Proof'], form_fields: ['deceased_name', 'deceased_nid', 'date_of_death', 'cause_of_death', 'applicant_relation'] },
  ];

  for (const s of services) {
    await client.query(
      `INSERT INTO services (slug, name, sector, required_docs, form_fields, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.name, s.sector, JSON.stringify(s.required_docs), JSON.stringify(s.form_fields)]
    );
  }

  console.log('✅ Seed data complete');
}

module.exports = { pool, runMigrations };
