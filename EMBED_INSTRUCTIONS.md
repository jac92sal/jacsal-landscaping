# 📦 Client Embed Instructions

## How to Add the Booking Form to Your Website

Follow these simple steps to add the booking form to your website.

---

## Option 1: iFrame Embed (Easiest)

### Step 1: Copy This Code

```html
<iframe
  src="YOUR_BOOKING_URL_HERE"
  width="100%"
  height="800px"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>
```

### Step 2: Paste Into Your Website

Add the code to your HTML file where you want the booking form to appear.

**For WordPress:**
1. Edit the page in WordPress
2. Add a "Custom HTML" block
3. Paste the code
4. Publish

**For Wix:**
1. Add an "Embed Code" element
2. Paste the code
3. Publish

**For Squarespace:**
1. Add a "Code" block
2. Paste the code
3. Save

### Step 3: Adjust Size (Optional)

You can change the height to fit your page better:

- Small: `height="600px"`
- Medium: `height="800px"`
- Large: `height="1000px"`

---

## Option 2: JavaScript Widget (Advanced)

For a more seamless integration:

```html
<div id="booking-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'YOUR_BOOKING_URL_HERE/widget.js';
    script.async = true;
    document.body.appendChild(script);
  })();
</script>
```

This option provides better mobile responsiveness and integrates more smoothly with your site design.

---

## Testing

After adding the code:

1. **View your website** in a browser
2. **Test the booking form:**
   - Fill out the form
   - Select a time
   - Submit a test booking
3. **Check mobile:**
   - View on your phone
   - Ensure it's readable and scrolls properly

---

## Troubleshooting

**Form not showing?**
- Check that you pasted the complete code
- Ensure your website allows iFrames
- Clear your browser cache

**Form too tall/short?**
- Adjust the `height="800px"` value
- Try different sizes to fit your page

**Form too wide?**
- The form automatically fits the container
- To limit width, wrap in a container:

```html
<div style="max-width: 800px; margin: 0 auto;">
  <!-- Paste iframe code here -->
</div>
```

---

## Need Help?

Contact your service provider for assistance with:
- Custom sizing
- Advanced styling
- Integration issues
- Technical questions

---

## 🎨 Customization

All visual branding (colors, logo, fonts) is controlled through the admin dashboard. Contact your service provider to request branding changes.
