import React, { useState } from 'react';

const SERVICE_LABELS = {
  cash_deposit: 'Cash Deposit',
  cash_withdrawal: 'Cash Withdrawal',
  fd_open: 'Fixed Deposit Opening',
  fd_close: 'Fixed Deposit Closure',
  fd_renew: 'Fixed Deposit Renewal',
  account_open: 'Account Opening',
  account_close: 'Account Closure',
  cheque_book_request: 'Cheque Book Request',
  statement_request: 'Statement Request',
  loan_inquiry: 'Loan Inquiry',
  utility_bill_payment: 'Utility Bill Payment',
  dps_open: 'DPS Opening',
  dps_close: 'DPS Closure',
  pay_order: 'Pay Order / DD',
  card_issue: 'Card Issuance',
  card_block: 'Card Blocking',
  card_replacement: 'Card Replacement',
  nid_correction: 'NID Correction',
  nid_reissue: 'NID Reissue',
  birth_certificate_new: 'Birth Certificate (New)',
  birth_certificate_correction: 'Birth Certificate Correction',
  passport_new: 'Passport (New)',
  passport_renewal: 'Passport Renewal',
  passport_correction: 'Passport Correction',
  trade_license_new: 'Trade License (New)',
  trade_license_renewal: 'Trade License Renewal',
  land_mutation: 'Land Mutation',
  tax_clearance: 'Tax Clearance',
  police_clearance: 'Police Clearance',
  utility_connection_gas: 'Gas Connection',
  utility_connection_water: 'Water Connection',
  utility_connection_electricity: 'Electricity Connection',
  marriage_certificate: 'Marriage Certificate',
  death_certificate: 'Death Certificate',
};

export default function FormDataTable({ generatedForms = {} }) {
  const [expanded, setExpanded] = useState({});

  const entries = Object.entries(generatedForms);

  if (!entries.length) {
    return <p className="text-sm text-gray-400 italic">No pre-filled form data available.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([serviceSlug, formData]) => {
        const isOpen = expanded[serviceSlug] !== false; // default open
        const label = SERVICE_LABELS[serviceSlug] || serviceSlug.replace(/_/g, ' ');
        const fields = Object.entries(formData).filter(([, v]) => v != null && v !== '');

        return (
          <div key={serviceSlug} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [serviceSlug]: !isOpen }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="font-semibold text-gray-800 text-sm">{label}</span>
              <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'} {fields.length} fields</span>
            </button>
            {isOpen && (
              <table className="w-full">
                <tbody>
                  {fields.map(([key, value]) => (
                    <tr key={key} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-2/5">
                        {key.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800 font-medium">
                        {String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
