# Thabazi Secondary School Admissions Hub

A digital school admissions platform developed for **Thabazi Secondary School** to simplify and modernise the student application process.

## About the Project

I developed this project for my rural high school as a way of **giving back to my community** and applying the technical skills I have gained through my Information Technology studies.

Many schools still rely on manual, paper-based admission processes, which can make managing student applications, documents, appointments, and available spaces challenging.

The Thabazi Secondary School Admissions Hub aims to provide a centralised and user-friendly platform where applicants can submit their information and documents, while authorised school staff can securely manage applications and admissions.

## Key Features

### Student Portal
- Online student application form
- Student and parent/guardian information capture
- Grade selection and availability
- Academic eligibility validation
- Secure document uploads
- Automatic application number generation
- Appointment scheduling
- Application and appointment confirmation emails

### Admin Dashboard
- Secure administrator login
- Role-based access control
- View and manage student applications
- Accept or decline applications
- View uploaded documents
- Manage appointments
- Manage grade capacity and available seats
- Staff/user management
- Admissions statistics and reporting

## Technology Stack

| Technology | Purpose |
|---|---|
| **React + TypeScript** | Frontend application |
| **Tailwind CSS** | Responsive user interface |
| **Supabase** | Backend, authentication, storage and database |
| **PostgreSQL** | Relational database |
| **Supabase RLS** | Database security and access control |
| **Supabase Storage** | Secure document storage |
| **RPC Functions** | Secure transactional application processing |
| **Lovable** | AI-assisted application development |
| **Git & GitHub** | Version control and project management |

## Security

Because the system handles sensitive student information, security is an important part of the project.

The application uses:

- Supabase Authentication
- Role-Based Access Control (RBAC)
- PostgreSQL Row-Level Security (RLS)
- Private document storage
- Secure database transactions
- Protected administrator routes
- Least-privilege access

Anonymous applicants can submit applications and upload required documents, while student records and private documents are restricted to authorised school staff.

## Application Workflow

```text
Applicant
   ↓
Online Application
   ↓
Upload Documents
   ↓
Grade Availability Check
   ↓
Secure Application Submission
   ↓
Appointment Created
   ↓
Confirmation Email
   ↓
School Admin Reviews Application
   ↓
Accept / Decline
