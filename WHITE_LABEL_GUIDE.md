# 🎨 White Label & Embed Guide

## Overview

Your booking system is now a **complete white-label SaaS solution**! Clients can fully customize branding and embed it on their websites.

## 🚀 Quick Setup

### Step 1: Run Branding Database Schema

```sql
-- Copy and run supabase-branding-schema.sql in Supabase SQL Editor
```

This creates the `branding_settings` table with default values.

### Step 2: Access Branding Manager

1. Go to `/admin`
2. Click **Branding** in the sidebar
3. Customize your client's branding

### Step 3: Generate Embed Code

1. Click **Embed Code** in admin sidebar
2. Choose **iFrame** or **JavaScript Widget**
3. Copy the code
4. Share with your client

---

## 🎨 Branding Features

### Company Information Tab
- **Company Name** - Displayed in header
- **Tagline** - Hero description
- **Website URL** - Link back to main site
- **Contact Email & Phone** - Support info

### Visual Branding Tab

**Logo & Icons:**
- Logo URL (PNG/SVG recommended)
- Favicon URL (32x32 or 64x64)

**Color Scheme:**
- Primary Color (buttons, links, highlights)
- Secondary Color (accents)
- Background Color
- Text Color

**Typography:**
- Heading Font (serif or sans-serif)
- Body Font (readable text)

### Social & Legal Tab
- Twitter, LinkedIn, Facebook, Instagram links
- Privacy Policy URL
- Terms of Service URL
- Custom footer text

### Advanced Tab

**White Label Settings:**
- ✅ Enable White Label Mode - Removes all third-party branding
- "Powered by" Text - Customize or hide completely

**Custom CSS:**
- Add custom CSS for advanced styling
- Override any default styles
- Use with caution

---

## 📦 Embed Options

### Option 1: iFrame Embed (Recommended)

**Best for:**
- Quick implementation
- Maximum compatibility
- Secure sandboxing

**Code:**
```html
<iframe
  src="https://your-booking-app.com"
  width="100%"
  height="800px"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>
```

**Customization:**
- Adjust width (100%, 600px, 800px)
- Adjust height based on content
- Add custom styles

**Pros:**
✅ Works everywhere
✅ No JavaScript required
✅ Isolated from parent site
✅ No conflicts

**Cons:**
❌ Fixed height can cause scrolling issues
❌ Doesn't inherit parent styles
❌ Third-party cookie restrictions

### Option 2: JavaScript Widget

**Best for:**
- Seamless integration
- Responsive design
- Better UX

**Code:**
```html
<div id="booking-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-booking-app.com/widget.js';
    script.async = true;
    document.body.appendChild(script);
  })();
</script>
```

**Note:** Widget script (`widget.js`) needs to be created for production use.

**Pros:**
✅ Seamless integration
✅ Can inherit parent styles
✅ Responsive height
✅ Better mobile experience

**Cons:**
⚠️ Requires JavaScript
⚠️ More complex to implement
⚠️ Potential style conflicts

---

## 🏢 Multi-Tenant Setup (Future Enhancement)

For serving multiple clients from one instance:

### Database Structure:
```sql
-- Add tenant_id to all tables
ALTER TABLE branding_settings ADD COLUMN tenant_id UUID;
ALTER TABLE services_config ADD COLUMN tenant_id UUID;
ALTER TABLE screening_questions ADD COLUMN tenant_id UUID;
ALTER TABLE screening_responses ADD COLUMN tenant_id UUID;

-- Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  plan_tier TEXT,
  created_at TIMESTAMP
);
```

### Subdomain Routing:
- `client1.yoursaas.com` → Loads client1's branding
- `client2.yoursaas.com` → Loads client2's branding

### Custom Domains:
- `booking.clientsite.com` → Points to your SaaS
- CNAME record configured
- SSL certificate auto-provisioned

---

## 🎯 White Label Use Cases

### Use Case 1: Agency Offering
```
Your Agency → Multiple Clients → Each has branded booking
```
- Each client gets their own branding
- You manage all from one admin
- Clients embed on their sites

### Use Case 2: Franchise System
```
Main Brand → Multiple Locations → Location-specific booking
```
- Consistent brand across locations
- Location-specific services and times
- Centralized booking management

### Use Case 3: SaaS Product
```
Your SaaS → End Users → White-labeled for each user
```
- Users sign up for accounts
- Each gets their own branded instance
- You charge subscription fees

---

## 📋 Client Onboarding Checklist

For each new client:

**Branding Setup:**
- [ ] Upload logo and favicon
- [ ] Set primary and secondary colors
- [ ] Choose fonts (heading + body)
- [ ] Add company information
- [ ] Set footer text
- [ ] Add social media links
- [ ] Configure privacy policy and terms URLs

**Services Configuration:**
- [ ] Add client's specific services
- [ ] Set descriptions
- [ ] Order services by priority

**Questions Customization:**
- [ ] Review default questions
- [ ] Add industry-specific questions
- [ ] Remove irrelevant questions
- [ ] Set required vs optional fields

**Embed Code:**
- [ ] Generate embed code
- [ ] Choose iFrame or widget
- [ ] Test on staging site
- [ ] Deploy to production
- [ ] Verify mobile responsiveness

**Testing:**
- [ ] Complete test booking
- [ ] Check email notifications (if enabled)
- [ ] Verify data in admin dashboard
- [ ] Test on multiple browsers
- [ ] Test on mobile devices

---

## 🔒 Security for Production

### Client Isolation:
- Implement Row Level Security (RLS) in Supabase
- Filter all queries by tenant_id
- Prevent cross-tenant data access

### Admin Access:
- Implement proper authentication
- Use JWT tokens
- Add role-based access control (RBAC)
- Audit log all admin actions

### Embed Security:
- Whitelist allowed domains
- Implement CORS properly
- Use Content Security Policy (CSP)
- Rate limit API requests

---

## 💰 Monetization Options

### Pricing Tiers:

**Starter ($29/month)**
- 100 bookings/month
- Basic branding
- iFrame embed only
- Email support

**Professional ($79/month)**
- 500 bookings/month
- Full branding control
- JavaScript widget
- Custom CSS
- Priority support

**Enterprise ($199/month)**
- Unlimited bookings
- White label mode
- Custom domain
- API access
- Dedicated support
- Custom integrations

---

## 📊 Analytics & Tracking

### Embed Analytics:
Track for each client:
- Number of embeds
- Embed pageviews
- Booking conversion rate
- Popular services
- Peak booking times

### Client Dashboard:
Provide clients with:
- Booking statistics
- Conversion metrics
- Popular time slots
- Service popularity
- Monthly trends

---

## 🚀 Next Steps

1. **Run the branding schema** in Supabase
2. **Test branding manager** - Customize your instance
3. **Generate embed code** - Test iFrame on a simple HTML page
4. **Add first client** - Set up their branding
5. **Share embed code** - Help them integrate
6. **Monitor bookings** - Track success in admin

---

## 🎉 You're Ready!

Your booking system is now a complete white-label SaaS platform that clients can embed on their websites with full branding control!

**Benefits:**
✅ No code changes needed for each client
✅ Fully customizable through admin UI
✅ Easy embed process
✅ Scalable for multiple clients
✅ Professional white-label solution

Happy selling! 🚀
