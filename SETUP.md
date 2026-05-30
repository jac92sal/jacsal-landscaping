# Setup Instructions

## 1. Database Setup (Required)

✅ Your Supabase connection is already configured automatically!

Now create the database table:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql` from this project
4. Paste into the SQL Editor
5. Click **Run** to create the table

This will create:
- `screening_responses` table with all required columns
- Indexes for performance
- Row Level Security policies

## 2. Verify the Application

The application should now be running in the preview. Test the flow:

### Test Flow:
1. **Fill out Initial Screening**
   - Name: Test User
   - Email: test@example.com
   - Service Interest: Choose any option
   - Description: Enter test project details

2. **AI Analysis**
   - Should display automatically after submission
   - Shows alignment score (75-90%)
   - Provides recommendations

3. **Complete Detailed Screening**
   - Answer questions about goals and challenges
   - Additional context fields

4. **Book a Time**
   - Select a future date on calendar
   - Choose an available time slot
   - Confirm booking

5. **View Confirmation**
   - See booking details
   - Calendar invite information
   - Next steps

## 3. Check Database

After testing, verify data in Supabase:
1. Go to **Table Editor** → `screening_responses`
2. You should see your test entry with all fields populated

## 4. Customization Options

### AI Analysis
Currently uses client-side logic. To enhance with real AI:
- Update `generateAIAnalysis()` in `App.tsx`
- Call an AI API (OpenAI, Anthropic, etc.)
- Process responses for intelligent matching

### Time Slots
Modify available times in `BookingCalendar.tsx`:
```typescript
const timeSlots = [
  '9:00 AM',
  '10:00 AM',
  // Add your times here
];
```

### Service Options
Update service types in `ScreeningOne.tsx`:
```typescript
<option value="your-service">Your Service</option>
```

### Email Notifications
Add email sending functionality:
- Use Supabase Edge Functions
- Integrate with SendGrid, Resend, etc.
- Trigger on booking confirmation

## 5. Production Considerations

Before going live:
- [ ] Update RLS policies for proper access control
- [ ] Add email verification
- [ ] Implement calendar conflict checking
- [ ] Add email notifications
- [ ] Set up proper error handling and logging
- [ ] Add analytics tracking
- [ ] Test mobile responsiveness
- [ ] Add loading states for slow connections
- [ ] Implement rate limiting for submissions

## Troubleshooting

**Database errors?**
- Verify the SQL schema was executed successfully
- Check Supabase project URL and keys are correct

**Form not submitting?**
- Check browser console for errors
- Verify all required fields are filled

**Dates not working?**
- Ensure system time is correct
- Check date-fns is installed

## Need Help?

The application is fully functional. If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase connection in the dashboard
3. Ensure the database table was created successfully
