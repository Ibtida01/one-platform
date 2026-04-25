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
        sector       TEXT DEFAULT 'general',
        created_at   TIMESTAMPTZ DEFAULT now()
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
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        citizen_id          UUID REFERENCES citizens(id),
        token_number        TEXT NOT NULL,
        sector              TEXT NOT NULL,
        raw_input           TEXT,
        detected_services   JSONB DEFAULT '[]',
        generated_forms     JSONB DEFAULT '{}',
        doc_checklist       JSONB DEFAULT '[]',
        officer_briefing    TEXT,
        ai_summary          TEXT,
        officer_id          UUID,
        status              TEXT DEFAULT 'waiting',
        needs_manual_review BOOLEAN DEFAULT false,
        created_at          TIMESTAMPTZ DEFAULT now(),
        served_at           TIMESTAMPTZ,
        completed_at        TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS service_logs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id    UUID REFERENCES tickets(id),
        notes        TEXT,
        completed_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS officers (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         TEXT NOT NULL,
        employee_id  TEXT UNIQUE NOT NULL,
        password     TEXT NOT NULL,
        role         TEXT DEFAULT 'officer',
        counter      TEXT,
        is_active    BOOLEAN DEFAULT true,
        created_at   TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        citizen_id   UUID REFERENCES citizens(id),
        service_slug TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status       TEXT DEFAULT 'booked',
        notes        TEXT,
        created_at   TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id    UUID REFERENCES tickets(id),
        rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
        comment      TEXT,
        created_at   TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id    UUID REFERENCES tickets(id),
        citizen_id   UUID REFERENCES citizens(id),
        type         TEXT NOT NULL,
        message      TEXT NOT NULL,
        sent_at      TIMESTAMPTZ DEFAULT now(),
        delivered    BOOLEAN DEFAULT false
      );
    `);

    console.log('✅ Migrations complete');
    await seedData(client);
  } finally {
    client.release();
  }
}

async function seedData(client) {
  const citizens = [
    { national_id: '1234567890', full_name: 'Fatema Begum',    phone: '+8801711223344', address: 'House 12, Road 5, Dhanmondi, Dhaka-1205', dob: '1985-03-15', sector: 'banking' },
    { national_id: '0987654321', full_name: 'Mohammad Karim',  phone: '+8801819988776', address: 'Flat 3B, Mirpur-10, Dhaka-1216',           dob: '1978-07-22', sector: 'government' },
    { national_id: '1122334455', full_name: 'Rina Akter',      phone: '+8801955667788', address: 'Village: Borogharia, Upazila: Savar, Dhaka', dob: '1992-11-08', sector: 'general' },
    { national_id: '5544332211', full_name: 'Jamal Uddin',     phone: '+8801622334455', address: 'House 88, Agrabad, Chittagong-4100',         dob: '1969-05-30', sector: 'government' },
    { national_id: '9988776655', full_name: 'Sadia Islam',     phone: '+8801533445566', address: 'Flat 7A, Bashundhara R/A, Block C, Dhaka',   dob: '1995-09-14', sector: 'banking' },
  ];
  for (const c of citizens) {
    await client.query(
      `INSERT INTO citizens (national_id, full_name, phone, address, dob, sector)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (national_id) DO NOTHING`,
      [c.national_id, c.full_name, c.phone, c.address, c.dob, c.sector]
    );
  }

  // Seed officers
  const officers = [
    { name: 'Rahman Ahmed',   employee_id: 'OFF001', password: 'officer123', role: 'officer',    counter: 'Counter 1' },
    { name: 'Nasrin Sultana', employee_id: 'OFF002', password: 'officer123', role: 'officer',    counter: 'Counter 2' },
    { name: 'Habib Ullah',    employee_id: 'OFF003', password: 'officer123', role: 'officer',    counter: 'Counter 3' },
    { name: 'Supervisor Ali', employee_id: 'SUP001', password: 'super123',   role: 'supervisor', counter: null },
  ];
  for (const o of officers) {
    await client.query(
      `INSERT INTO officers (name, employee_id, password, role, counter)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (employee_id) DO NOTHING`,
      [o.name, o.employee_id, o.password, o.role, o.counter]
    );
  }

  const services = [
    { slug: 'cash_deposit',        name: 'Cash Deposit',              sector: 'banking',    required_docs: ['National ID','Passbook'],                             form_fields: ['account_number','amount','depositor_name','phone'] },
    { slug: 'cash_withdrawal',     name: 'Cash Withdrawal',           sector: 'banking',    required_docs: ['National ID','Passbook','Withdrawal Slip'],           form_fields: ['account_number','amount','purpose'] },
    { slug: 'fd_open',             name: 'Fixed Deposit Opening',     sector: 'banking',    required_docs: ['National ID','Passport Photo (2)','TIN Certificate'], form_fields: ['account_number','fd_amount','tenure_months','nominee_name'] },
    { slug: 'fd_close',            name: 'Fixed Deposit Closure',     sector: 'banking',    required_docs: ['National ID','FD Receipt','Passbook'],                form_fields: ['fd_receipt_number','reason'] },
    { slug: 'fd_renew',            name: 'Fixed Deposit Renewal',     sector: 'banking',    required_docs: ['National ID','FD Receipt'],                           form_fields: ['fd_receipt_number','new_tenure_months'] },
    { slug: 'account_open',        name: 'Account Opening',           sector: 'banking',    required_docs: ['National ID','Passport Photo (2)','Nominee Photo'],   form_fields: ['account_type','initial_deposit','nominee_name','nominee_nid'] },
    { slug: 'account_open_savings',name: 'Savings Account Opening',   sector: 'banking',    required_docs: ['National ID','Passport Photo (2)'],                  form_fields: ['initial_deposit','nominee_name'] },
    { slug: 'account_open_current',name: 'Current Account Opening',   sector: 'banking',    required_docs: ['National ID','TIN Certificate','Trade License'],     form_fields: ['business_name','initial_deposit'] },
    { slug: 'account_open_student',name: 'Student Account Opening',   sector: 'banking',    required_docs: ['National ID','Student ID','Guardian NID'],           form_fields: ['institution_name','class','guardian_name'] },
    { slug: 'account_close',       name: 'Account Closure',           sector: 'banking',    required_docs: ['National ID','Passbook','All Cheques'],              form_fields: ['account_number','reason'] },
    { slug: 'cheque_book_request', name: 'Cheque Book Request',       sector: 'banking',    required_docs: ['National ID','Passbook'],                            form_fields: ['account_number','leaves_count'] },
    { slug: 'statement_request',   name: 'Bank Statement',            sector: 'banking',    required_docs: ['National ID'],                                       form_fields: ['account_number','from_date','to_date'] },
    { slug: 'loan_inquiry',        name: 'Loan Inquiry',              sector: 'banking',    required_docs: ['National ID','Income Proof'],                        form_fields: ['loan_type','amount_required','monthly_income'] },
    { slug: 'loan_apply_personal', name: 'Personal Loan',             sector: 'banking',    required_docs: ['National ID','Income Proof','Bank Statement (6mo)'], form_fields: ['amount','tenure_months','purpose','monthly_income'] },
    { slug: 'loan_apply_home',     name: 'Home Loan',                 sector: 'banking',    required_docs: ['National ID','Property Deed','Income Proof'],        form_fields: ['property_address','loan_amount','tenure_months'] },
    { slug: 'loan_apply_car',      name: 'Car Loan',                  sector: 'banking',    required_docs: ['National ID','Income Proof','Quotation'],            form_fields: ['vehicle_type','loan_amount','tenure_months'] },
    { slug: 'loan_apply_business', name: 'Business Loan',             sector: 'banking',    required_docs: ['National ID','Trade License','Business Plan'],       form_fields: ['business_name','loan_amount','tenure_months'] },
    { slug: 'loan_apply_sme',      name: 'SME Loan',                  sector: 'banking',    required_docs: ['National ID','Trade License','TIN','Bank Statement'], form_fields: ['business_name','loan_amount','tenure_months'] },
    { slug: 'utility_bill_payment',name: 'Utility Bill Payment',      sector: 'banking',    required_docs: ['Bill Copy'],                                         form_fields: ['bill_type','customer_number','amount'] },
    { slug: 'dps_open',            name: 'DPS Opening',               sector: 'banking',    required_docs: ['National ID','Passport Photo','Account Number'],     form_fields: ['monthly_installment','tenure_months','linked_account'] },
    { slug: 'dps_close',           name: 'DPS Closure',               sector: 'banking',    required_docs: ['National ID','DPS Passbook'],                        form_fields: ['dps_account_number','reason'] },
    { slug: 'pay_order',           name: 'Pay Order / DD',            sector: 'banking',    required_docs: ['National ID','Payment'],                             form_fields: ['payee_name','amount','purpose','payee_bank'] },
    { slug: 'card_issue_debit',    name: 'Debit Card Issuance',       sector: 'banking',    required_docs: ['National ID','Passport Photo'],                      form_fields: ['account_number','card_type'] },
    { slug: 'card_issue_credit',   name: 'Credit Card Application',   sector: 'banking',    required_docs: ['National ID','Income Proof','Bank Statement'],       form_fields: ['credit_limit_requested','monthly_income'] },
    { slug: 'card_block',          name: 'Card Blocking',             sector: 'banking',    required_docs: ['National ID'],                                       form_fields: ['card_last_four','reason'] },
    { slug: 'card_replacement',    name: 'Card Replacement',          sector: 'banking',    required_docs: ['National ID','GD Copy (if stolen)'],                form_fields: ['card_last_four','reason','delivery_address'] },
    { slug: 'mobile_banking_register', name: 'Mobile Banking Registration', sector: 'banking', required_docs: ['National ID','SIM Card'],                       form_fields: ['mobile_number','account_number'] },
    { slug: 'remittance_receive',  name: 'Remittance Receive',        sector: 'banking',    required_docs: ['National ID','Remittance Slip'],                    form_fields: ['sender_name','sender_country','amount','reference_number'] },
    { slug: 'nominee_update',      name: 'Nominee Update',            sector: 'banking',    required_docs: ['National ID','Nominee NID','Nominee Photo'],        form_fields: ['account_number','nominee_name','nominee_relation','nominee_nid'] },
    { slug: 'address_update',      name: 'Address Update',            sector: 'banking',    required_docs: ['National ID','Utility Bill (new address)'],         form_fields: ['account_number','new_address'] },
    { slug: 'signature_update',    name: 'Signature Update',          sector: 'banking',    required_docs: ['National ID'],                                      form_fields: ['account_number','reason'] },
    { slug: 'nid_correction',      name: 'NID Correction',            sector: 'government', required_docs: ['Birth Certificate','SSC Certificate','Supporting Docs'], form_fields: ['current_nid','field_to_correct','correct_value','reason'] },
    { slug: 'nid_reissue',         name: 'NID Reissue',               sector: 'government', required_docs: ['GD Copy','Birth Certificate','Passport Photo'],     form_fields: ['reason','gd_number','gd_station'] },
    { slug: 'nid_smart_card_new',  name: 'Smart NID Card',            sector: 'government', required_docs: ['National ID','Passport Photo'],                     form_fields: ['delivery_preference'] },
    { slug: 'birth_certificate_new', name: 'Birth Certificate (New)', sector: 'government', required_docs: ['Hospital Birth Record','Parents NID'],             form_fields: ['child_name','dob','father_name','mother_name','birth_place'] },
    { slug: 'birth_certificate_correction', name: 'Birth Certificate Correction', sector: 'government', required_docs: ['Existing Certificate','Supporting Proof'], form_fields: ['certificate_number','field_to_correct','correct_value'] },
    { slug: 'death_certificate',   name: 'Death Certificate',         sector: 'government', required_docs: ['Hospital Death Certificate','Deceased NID','Applicant NID'], form_fields: ['deceased_name','date_of_death','cause_of_death','applicant_relation'] },
    { slug: 'marriage_certificate',name: 'Marriage Certificate',      sector: 'government', required_docs: ['Both Parties NID','Passport Photos','Witnesses NID'], form_fields: ['husband_name','wife_name','marriage_date','kazi_name'] },
    { slug: 'citizenship_certificate', name: 'Citizenship Certificate', sector: 'government', required_docs: ['National ID','Passport Photo'],                  form_fields: ['purpose','destination'] },
    { slug: 'character_certificate', name: 'Character Certificate',   sector: 'government', required_docs: ['National ID','Passport Photo'],                    form_fields: ['purpose','issuing_authority'] },
    { slug: 'passport_new',        name: 'Passport (New)',            sector: 'government', required_docs: ['National ID','Birth Certificate','Photo (4)','Bank Receipt'], form_fields: ['passport_type','delivery_type','travel_purpose'] },
    { slug: 'passport_renewal',    name: 'Passport Renewal',          sector: 'government', required_docs: ['Existing Passport','National ID','Photo (4)','Bank Receipt'], form_fields: ['old_passport_number','expiry_date','delivery_type'] },
    { slug: 'passport_correction', name: 'Passport Correction',       sector: 'government', required_docs: ['Existing Passport','National ID','Supporting Docs'], form_fields: ['old_passport_number','field_to_correct','correct_value'] },
    { slug: 'passport_emergency',  name: 'Emergency Passport',        sector: 'government', required_docs: ['National ID','Photo (4)','Urgency Proof'],         form_fields: ['travel_date','destination','reason'] },
    { slug: 'police_clearance',    name: 'Police Clearance',          sector: 'government', required_docs: ['National ID','Passport','Photo (4)','Bank Receipt'], form_fields: ['purpose','destination_country','passport_number'] },
    { slug: 'visa_noc',            name: 'Visa NOC',                  sector: 'government', required_docs: ['National ID','Passport','Employer Letter'],        form_fields: ['destination_country','visa_type','employer_name'] },
    { slug: 'trade_license_new',   name: 'Trade License (New)',       sector: 'government', required_docs: ['National ID','Business Premises Proof','TIN'],     form_fields: ['business_name','business_type','address','annual_turnover'] },
    { slug: 'trade_license_renewal', name: 'Trade License Renewal',   sector: 'government', required_docs: ['Existing License','National ID','TIN'],           form_fields: ['license_number','business_name','renewal_period'] },
    { slug: 'tin_registration',    name: 'TIN Registration',          sector: 'government', required_docs: ['National ID','Passport Photo'],                    form_fields: ['income_source','annual_income'] },
    { slug: 'vat_registration',    name: 'VAT Registration',          sector: 'government', required_docs: ['National ID','Trade License','TIN'],              form_fields: ['business_name','annual_turnover'] },
    { slug: 'company_registration',name: 'Company Registration',      sector: 'government', required_docs: ['NID (all directors)','MOA','AOA'],                form_fields: ['company_name','company_type','authorized_capital'] },
    { slug: 'fire_license',        name: 'Fire License',              sector: 'government', required_docs: ['Trade License','Building Plan','NID'],            form_fields: ['business_address','building_floors','fire_equipment_list'] },
    { slug: 'land_mutation',       name: 'Land Mutation',             sector: 'government', required_docs: ['Deed of Sale','NID','Mouza Map','Khatian'],       form_fields: ['plot_number','mouza','upazila','district','previous_owner'] },
    { slug: 'khatian_copy',        name: 'Khatian Copy',              sector: 'government', required_docs: ['NID'],                                            form_fields: ['khatian_number','mouza','upazila'] },
    { slug: 'deed_registration',   name: 'Deed Registration',         sector: 'government', required_docs: ['Draft Deed','NID (both parties)','Tax Payment'], form_fields: ['property_address','deed_value','buyer_name','seller_name'] },
    { slug: 'land_tax_payment',    name: 'Land Tax Payment',          sector: 'government', required_docs: ['NID','Khatian Copy'],                            form_fields: ['khatian_number','amount','year'] },
    { slug: 'tax_clearance',       name: 'Tax Clearance',             sector: 'government', required_docs: ['NID','TIN','Tax Returns (3yr)','Bank Statement'], form_fields: ['tin_number','purpose','assessment_year'] },
    { slug: 'income_tax_return',   name: 'Income Tax Return',         sector: 'government', required_docs: ['NID','TIN','Income Proof'],                      form_fields: ['assessment_year','total_income','tax_paid'] },
    { slug: 'wealth_statement',    name: 'Wealth Statement',          sector: 'government', required_docs: ['NID','TIN','Asset Documents'],                   form_fields: ['assessment_year','total_assets','total_liabilities'] },
    { slug: 'utility_connection_gas',         name: 'Gas Connection',         sector: 'government', required_docs: ['NID','Property Deed','Building Plan'],  form_fields: ['property_address','property_type','owner_name'] },
    { slug: 'utility_connection_water',       name: 'Water Connection',       sector: 'government', required_docs: ['NID','Property Deed','Building Plan'],  form_fields: ['property_address','property_type','connection_size'] },
    { slug: 'utility_connection_electricity', name: 'Electricity Connection', sector: 'government', required_docs: ['NID','Property Deed','Building Plan','Load Assessment'], form_fields: ['property_address','load_required_kw','connection_type'] },
    { slug: 'utility_connection_broadband',   name: 'Broadband Connection',   sector: 'government', required_docs: ['NID','Property Deed'],                  form_fields: ['property_address','speed_required'] },
    { slug: 'driving_license_new',     name: 'Driving License (New)',     sector: 'government', required_docs: ['NID','Medical Certificate','Photo'],         form_fields: ['vehicle_type','blood_group'] },
    { slug: 'driving_license_renewal', name: 'Driving License Renewal',   sector: 'government', required_docs: ['Existing License','NID','Medical Certificate'], form_fields: ['license_number','expiry_date'] },
    { slug: 'vehicle_registration',    name: 'Vehicle Registration',      sector: 'government', required_docs: ['NID','Purchase Invoice','Insurance'],        form_fields: ['vehicle_type','engine_number','chassis_number'] },
    { slug: 'vehicle_fitness_certificate', name: 'Vehicle Fitness Certificate', sector: 'government', required_docs: ['Registration Certificate','Insurance'], form_fields: ['registration_number','vehicle_type'] },
    { slug: 'vehicle_tax_token',       name: 'Vehicle Tax Token',         sector: 'government', required_docs: ['Registration Certificate','Fitness Certificate'], form_fields: ['registration_number','year'] },
    { slug: 'disability_certificate',  name: 'Disability Certificate',    sector: 'government', required_docs: ['NID','Medical Board Report','Photo'],        form_fields: ['disability_type','severity','doctor_name'] },
    { slug: 'old_age_allowance_enroll', name: 'Old Age Allowance',        sector: 'government', required_docs: ['NID','Photo','Bank Account'],               form_fields: ['date_of_birth','income_level','bank_account'] },
    { slug: 'widow_allowance_enroll',  name: 'Widow Allowance',           sector: 'government', required_docs: ['NID','Husband Death Certificate','Photo'],  form_fields: ['husband_name','date_of_death','bank_account'] },
    { slug: 'freedom_fighter_certificate', name: 'Freedom Fighter Certificate', sector: 'government', required_docs: ['NID','Gazetted List Proof','Photo'], form_fields: ['freedom_fighter_id','sector_number'] },
    { slug: 'medical_certificate_govt', name: 'Medical Certificate (Govt)', sector: 'government', required_docs: ['NID','Hospital Records'],                form_fields: ['purpose','doctor_name','hospital_name'] },
    { slug: 'labour_card',           name: 'Labour Card',                 sector: 'government', required_docs: ['NID','Employer Letter','Photo'],            form_fields: ['employer_name','work_type','monthly_wage'] },
    { slug: 'work_permit_foreign',   name: 'Foreign Work Permit',         sector: 'government', required_docs: ['Passport','NID','Employment Contract'],     form_fields: ['destination_country','employer_name','job_title','salary'] },
    { slug: 'eobi_registration',     name: 'EOBI Registration',           sector: 'government', required_docs: ['NID','Employer Letter'],                    form_fields: ['employer_name','monthly_salary','employment_date'] },
    { slug: 'provident_fund_claim',  name: 'Provident Fund Claim',        sector: 'government', required_docs: ['NID','Employment Certificate','PF Statement'], form_fields: ['employer_name','pf_account_number','claim_reason'] },
  ];

  for (const s of services) {
    await client.query(
      `INSERT INTO services (slug, name, sector, required_docs, form_fields, is_active)
       VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.name, s.sector, JSON.stringify(s.required_docs), JSON.stringify(s.form_fields)]
    );
  }

  console.log('✅ Seed data complete');
}

module.exports = { pool, runMigrations };
