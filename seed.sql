-- ONE Platform — Seed Data
-- Run this manually if you want to reset to a clean demo state
-- The server/db.js runs migrations + seed on every startup automatically

-- Clear existing demo data (optional)
-- TRUNCATE service_logs, tickets, services, citizens CASCADE;

-- Citizens
INSERT INTO citizens (national_id, full_name, phone, address, dob, sector) VALUES
  ('1234567890', 'Fatema Begum',    '+8801711223344', 'House 12, Road 5, Dhanmondi, Dhaka-1205',              '1985-03-15', 'banking'),
  ('0987654321', 'Mohammad Karim', '+8801819988776', 'Flat 3B, Mirpur-10, Dhaka-1216',                        '1978-07-22', 'government'),
  ('1122334455', 'Rina Akter',     '+8801955667788', 'Village: Borogharia, Upazila: Savar, Dhaka',            '1992-11-08', 'general'),
  ('5544332211', 'Jamal Uddin',    '+8801622334455', 'House 88, Agrabad, Chittagong-4100',                    '1969-05-30', 'government'),
  ('9988776655', 'Sadia Islam',    '+8801533445566', 'Flat 7A, Bashundhara R/A, Block C, Dhaka-1229',         '1995-09-14', 'banking')
ON CONFLICT (national_id) DO NOTHING;

-- Banking Services
INSERT INTO services (slug, name, sector, required_docs, form_fields) VALUES
('cash_deposit',        'Cash Deposit',              'banking',    '["National ID","Account Number / Passbook"]',                    '["account_number","amount","depositor_name","phone"]'),
('cash_withdrawal',     'Cash Withdrawal',           'banking',    '["National ID","Passbook","Withdrawal Slip"]',                    '["account_number","amount","purpose"]'),
('fd_open',             'Fixed Deposit Opening',     'banking',    '["National ID","Passport Photo (2 copies)","TIN Certificate"]',   '["account_number","fd_amount","tenure_months","nominee_name"]'),
('fd_close',            'Fixed Deposit Closure',     'banking',    '["National ID","FD Receipt","Passbook"]',                         '["fd_receipt_number","reason"]'),
('fd_renew',            'Fixed Deposit Renewal',     'banking',    '["National ID","FD Receipt"]',                                    '["fd_receipt_number","new_tenure_months"]'),
('account_open',        'Account Opening',           'banking',    '["National ID","Passport Photo (2 copies)","Nominee Photo"]',     '["account_type","initial_deposit","nominee_name","nominee_nid"]'),
('account_close',       'Account Closure',           'banking',    '["National ID","Passbook","All Cheque Books"]',                   '["account_number","reason"]'),
('cheque_book_request', 'Cheque Book Request',       'banking',    '["National ID","Passbook"]',                                      '["account_number","leaves_count"]'),
('statement_request',   'Bank Statement Request',    'banking',    '["National ID"]',                                                 '["account_number","from_date","to_date"]'),
('loan_inquiry',        'Loan Inquiry / Application','banking',    '["National ID","Income Proof","Bank Statement (6 months)"]',      '["loan_type","amount_required","repayment_tenure","monthly_income"]'),
('utility_bill_payment','Utility Bill Payment',      'banking',    '["Utility Bill","Account or Cash"]',                             '["bill_type","customer_number","amount"]'),
('dps_open',            'DPS Account Opening',       'banking',    '["National ID","Passport Photo","Account Number"]',               '["monthly_installment","tenure_months","linked_account"]'),
('dps_close',           'DPS Account Closure',       'banking',    '["National ID","DPS Passbook"]',                                  '["dps_account_number","reason"]'),
('pay_order',           'Pay Order / Demand Draft',  'banking',    '["National ID","Payment (cash or debit)"]',                      '["payee_name","amount","purpose","payee_bank"]'),
('card_issue',          'Card Issuance',             'banking',    '["National ID","Passport Photo","Account Statement"]',            '["card_type","account_number"]'),
('card_block',          'Card Blocking',             'banking',    '["National ID"]',                                                 '["card_last_four","reason"]'),
('card_replacement',    'Card Replacement',          'banking',    '["National ID","GD Copy (if stolen)"]',                          '["card_last_four","reason","delivery_address"]')
ON CONFLICT (slug) DO NOTHING;

-- Government Services
INSERT INTO services (slug, name, sector, required_docs, form_fields) VALUES
('nid_correction',              'National ID Correction',        'government', '["Birth Certificate","SSC Certificate","Supporting Documents"]',    '["current_nid","field_to_correct","correct_value"]'),
('nid_reissue',                 'National ID Reissue',           'government', '["GD Copy (if lost)","Birth Certificate","Passport Photo"]',        '["reason","gd_number","gd_station"]'),
('birth_certificate_new',       'Birth Certificate (New)',       'government', '["Hospital Birth Record","Parents NID","Marriage Certificate"]',    '["child_name","dob","father_name","mother_name"]'),
('birth_certificate_correction','Birth Certificate Correction',  'government', '["Existing Birth Certificate","Supporting Proof"]',                 '["certificate_number","field_to_correct","correct_value"]'),
('passport_new',                'Passport Application (New)',    'government', '["National ID","Birth Certificate","Passport Photo (4 copies)"]',   '["passport_type","delivery_type","travel_purpose"]'),
('passport_renewal',            'Passport Renewal',              'government', '["Existing Passport","National ID","Passport Photo (4 copies)"]',   '["old_passport_number","expiry_date","delivery_type"]'),
('passport_correction',         'Passport Correction',           'government', '["Existing Passport","National ID","Supporting Documents"]',        '["old_passport_number","field_to_correct","correct_value"]'),
('trade_license_new',           'Trade License (New)',           'government', '["National ID","Business Premises Proof","TIN Certificate"]',       '["business_name","business_type","address"]'),
('trade_license_renewal',       'Trade License Renewal',         'government', '["Existing Trade License","National ID","TIN Certificate"]',        '["license_number","business_name","renewal_period"]'),
('land_mutation',               'Land Mutation / Record Fix',    'government', '["Deed of Sale","NID","Mouza Map","Khatian Copy"]',                 '["plot_number","mouza","upazila","district"]'),
('tax_clearance',               'Tax Clearance Certificate',     'government', '["NID","TIN Certificate","Tax Returns (3 yrs)"]',                   '["tin_number","purpose","assessment_year"]'),
('police_clearance',            'Police Clearance Certificate',  'government', '["NID","Passport","Passport Photo (4 copies)"]',                    '["purpose","destination_country","passport_number"]'),
('utility_connection_gas',      'Gas Connection (New)',          'government', '["NID","Property Deed","Building Approval Plan"]',                  '["property_address","property_type","owner_name"]'),
('utility_connection_water',    'Water Connection (New)',        'government', '["NID","Property Deed","Building Approval Plan"]',                  '["property_address","property_type","connection_size"]'),
('utility_connection_electricity','Electricity Connection (New)','government', '["NID","Property Deed","Building Approval Plan","Load Assessment"]','["property_address","load_required_kw","connection_type"]'),
('marriage_certificate',        'Marriage Certificate',          'government', '["Both Parties NID","Passport Photos","Witnesses NID (2)"]',        '["husband_name","wife_name","marriage_date","kazi_name"]'),
('death_certificate',           'Death Certificate',             'government', '["Hospital Death Certificate","Deceased NID","Applicant NID"]',     '["deceased_name","date_of_death","cause_of_death","applicant_relation"]')
ON CONFLICT (slug) DO NOTHING;
