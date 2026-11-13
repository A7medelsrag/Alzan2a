# Admin permission matrix

Permissions are enforced by the API. Hiding a dashboard control is only a user-interface aid.

| Area | Owner | Manager | Inventory | Accountant | Support |
|---|---|---|---|---|---|
| Overview | Full | Full | Non-financial overview | Finance overview | Non-financial overview |
| Orders | Manage | Manage | View | View | Manage |
| Catalog | Manage | Manage | Manage | View | View |
| Purchases and suppliers | Manage | Manage | Manage | Manage | — |
| Finance, expenses, settlements | Manage | View | — | Manage | — |
| Shipping rates | Manage | Manage | — | — | — |
| Store settings | Manage | View | — | — | — |
| Customers and reviews | Manage | Manage | — | — | Manage |
| Homepage, coupons, offers | Manage | Manage | — | — | — |
| Staff, audit log | Manage | View audit log | — | — | — |

Staff management is Owner-only. Staff passwords require at least 15 characters. MFA enrollment and reset material is shown once. Changes to staff access revoke the staff member's indexed Redis sessions. Every admin mutation requires an allowed Origin and valid CSRF token; sensitive business mutations also write an audit record.
