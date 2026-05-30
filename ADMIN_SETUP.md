# Admin Dashboard Setup Guide

## 🎉 What's New

Your booking application now includes a **comprehensive admin dashboard** that allows you to configure everything without touching code!

## 📋 Database Setup

**IMPORTANT:** Before using the admin dashboard, you must run the admin schema in your Supabase database.

### Step 1: Run Admin Schema SQL

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-admin-schema.sql` from your project
4. Paste and **Run** the SQL

This creates all the necessary tables for:
- Admin users
- Secrets vault (API keys)
- Services configuration
- Screening questions
- Time slots
- App settings

## 🔐 Accessing the Admin Dashboard

### Access the Dashboard

1. **Navigate to**: `/admin` in your browser (or click the floating settings icon)
2. **Default Login Credentials**:
   - Email: `admin@example.com`
   - Password: `admin123`

### Change Default Password

For security, you should:
1. Update the credentials in `Admin.tsx`
2. Or add a new admin user to the `admin_users` table in Supabase
3. In production, implement proper password hashing

## 🛠️ Admin Features

### 1. **Overview Dashboard**
- View total bookings and statistics
- See average AI alignment scores
- Track in-progress screenings
- View recent activity

### 2. **Bookings Management**
- View all consultation bookings
- Filter by status (screening one, screening two, booked, completed)
- Search by name, email, or service
- See detailed information for each booking
- Track AI analysis scores

### 3. **Services Manager**
Add, edit, or remove services shown in your booking form:
- **Service Name**: Display name (e.g., "Web Development")
- **Service Value**: Internal ID (e.g., "web-development")
- **Description**: Brief description
- **Active/Inactive**: Toggle visibility
- Drag to reorder (visual order)

**Example:**
```
Name: Custom Software Development
Value: custom-software
Description: Build tailored software solutions
Active: ✓
```

### 4. **Questions Manager**
Fully customize screening questions for both steps:

#### Screening One (Initial Screening)
- Add/remove fields
- Change labels and placeholders
- Mark fields as required/optional
- Supported field types:
  - Text
  - Email
  - Phone
  - Number
  - Textarea
  - Select (dropdown)

#### Screening Two (Detailed Info)
- Same customization options
- Typically more open-ended questions

**Example Custom Question:**
```json
Field Name: company_size
Field Label: Company Size
Field Type: select
Options: [
  {"label": "1-10 employees", "value": "1-10"},
  {"label": "11-50 employees", "value": "11-50"},
  {"label": "51-200 employees", "value": "51-200"},
  {"label": "200+ employees", "value": "200+"}
]
Required: Yes
```

### 5. **Secrets Vault (API Keys)**
Securely store API keys for integrations:

#### Quick Add Common Secrets:
- OpenAI API Key (for AI analysis)
- Anthropic API Key (for Claude AI)
- Google Calendar API credentials
- Resend API Key (email notifications)
- SendGrid API Key
- Twilio credentials (SMS notifications)

**How to Add:**
1. Click "Add Secret"
2. Enter **Key Name** (e.g., `OPENAI_API_KEY`)
3. Paste your **API Key**
4. Add **Description** (what it's for)
5. Save

**Security Notes:**
- Keys are stored in Supabase
- Show/hide toggle for viewing keys
- Only add keys when needed
- Keep production keys separate

### 6. **Settings**
Configure global app settings:

#### Application Settings:
- **App Name**: Customize the title
- **App Description**: Customize the tagline
- **AI Analysis**: Enable/disable AI features
- **Email Notifications**: Toggle email alerts
- **Google Calendar**: Enable calendar integration

#### Time Slots:
- Enable/disable specific booking times
- All slots are configurable
- Changes apply immediately to calendar

## 🔗 Integrations Setup

### AI Analysis (OpenAI or Anthropic)

1. Get your API key from [OpenAI](https://platform.openai.com/) or [Anthropic](https://console.anthropic.com/)
2. Add to Secrets Vault:
   - Name: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - Value: Your API key
3. Enable in Settings → "Enable AI Analysis"
4. Update code to use the key from the secrets vault

### Email Notifications (Resend or SendGrid)

1. Get your API key from [Resend](https://resend.com/) or [SendGrid](https://sendgrid.com/)
2. Add to Secrets Vault:
   - Name: `RESEND_API_KEY` or `SENDGRID_API_KEY`
   - Value: Your API key
3. Enable in Settings → "Email Notifications"
4. Implement email sending in your code

### Google Calendar Integration

1. Create a Google Cloud project
2. Enable Google Calendar API
3. Get OAuth credentials
4. Add to Secrets Vault:
   - `GOOGLE_CALENDAR_API_KEY`
   - `GOOGLE_CALENDAR_CLIENT_ID`
   - `GOOGLE_CALENDAR_CLIENT_SECRET`
5. Enable in Settings → "Google Calendar"
6. Implement calendar sync in your code

## 🎨 Customization Examples

### Example 1: Add a New Service

```
Services Manager → Add Service

Service Name: SEO Optimization
Service Value: seo-optimization
Description: Improve your search engine rankings
Active: ✓

Result: Appears in screening form dropdown
```

### Example 2: Add Custom Question

```
Questions Manager → Screening One → Add Question

Field Name: industry
Field Label: What industry are you in?
Field Type: select
Options: [
  {"label": "Technology", "value": "tech"},
  {"label": "Healthcare", "value": "healthcare"},
  {"label": "Finance", "value": "finance"},
  {"label": "Retail", "value": "retail"},
  {"label": "Other", "value": "other"}
]
Required: Yes

Result: New dropdown appears in screening form
```

### Example 3: Modify Time Slots

```
Settings → Time Slots

Enable: 9:00 AM, 10:00 AM, 2:00 PM, 3:00 PM
Disable: 11:00 AM, 1:00 PM, 4:00 PM

Result: Only enabled times show in calendar
```

## 🚀 Going to Production

### Security Checklist:
- [ ] Change default admin password
- [ ] Implement proper password hashing
- [ ] Add admin user roles/permissions
- [ ] Secure API keys in environment variables
- [ ] Enable Supabase RLS policies for admin tables
- [ ] Use HTTPS for all connections
- [ ] Implement rate limiting
- [ ] Add audit logging for admin actions

### Performance:
- [ ] Index frequently queried fields
- [ ] Cache configuration data
- [ ] Optimize Supabase queries
- [ ] Add pagination for large booking lists

## 🆘 Troubleshooting

**Can't log into admin?**
- Verify you're using correct credentials
- Check browser console for errors
- Clear localStorage: `localStorage.clear()`

**Changes not appearing?**
- Refresh the page
- Check Supabase for data
- Verify SQL schema was run correctly

**Secrets not saving?**
- Check Supabase connection
- Verify admin schema was installed
- Check browser console for errors

## 📚 Next Steps

1. **Customize Your Services**: Add the specific services you offer
2. **Tailor Questions**: Modify screening questions to match your needs
3. **Add API Keys**: Set up integrations you want to use
4. **Configure Settings**: Adjust app name, description, and features
5. **Test Everything**: Go through the booking flow as a client
6. **Monitor Bookings**: Check the bookings tab regularly

Your admin dashboard is now ready to use! Everything is configurable without touching code. 🎉
