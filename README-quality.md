# Development Quality Standards

**Site:** Ваши Мастера  
**Standards:** Best Practices for Web Development  
**Last Updated:** April 21, 2026

---

## Code Quality Standards

### HTML/CSS Standards

1. **Semantic HTML**
   - ✅ Use semantic tags: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
   - ✅ Proper heading hierarchy (H1 > H2 > H3, no skipping)
   - ✅ Use `<label>` for all form inputs
   - ✅ ARIA labels for accessibility (`aria-label`, `aria-describedby`)

2. **CSS Organization**
   - Separate CSS into logical components
   - Use consistent naming conventions (BEM or similar)
   - Avoid inline styles in HTML (except for dynamic content)
   - Use CSS variables for reusable values

3. **Responsive Design**
   - Mobile-first approach
   - Test on: 320px, 768px, 1024px, 1440px+
   - Use CSS Grid and Flexbox
   - Avoid hardcoded pixel dimensions

### JavaScript Standards

1. **Code Structure**
   ```javascript
   // ✅ Good: Organized, modular
   function calculatePrice(area, type) {
     // ...
   }
   
   // ✅ Good: Descriptive names
   const roomData = {};
   const demolitionItems = [];
   
   // ❌ Avoid: Global pollution
   var x = 100; // Too vague
   window.temp = 'value'; // Avoid
   ```

2. **Function Guidelines**
   - Keep functions < 50 lines
   - One responsibility per function
   - Use const/let (never var)
   - Add JSDoc comments for public functions

3. **Error Handling**
   ```javascript
   // ✅ Good
   try {
     fetchData();
   } catch (error) {
     logError(error);
     showUserMessage('Failed to load');
   }
   
   // ❌ Avoid
   console.log('Error:', error); // Leaves debug code
   ```

4. **No Debug Code in Production**
   - ❌ Remove all `console.log()`
   - ❌ Remove all `debugger;` statements
   - ❌ Remove commented-out code
   - ✅ Use proper logging service instead

### PHP Standards

1. **Type Safety**
   ```php
   // ✅ Good: Strict types
   declare(strict_types=1);
   
   function sendEmail(string $to, string $subject): bool {
     // ...
   }
   ```

2. **Input Validation**
   - Always validate and sanitize inputs
   - Use type hints for parameters
   - Validate before sanitizing
   - Return specific error messages

3. **Security**
   - ✅ Use `htmlspecialchars()` for HTML output
   - ✅ Use prepared statements for database queries
   - ✅ Store sensitive data in environment variables
   - ❌ Never hardcode credentials
   - ❌ Never expose error details to users

---

## Testing Standards

### Automated Testing

Currently: **Manual testing only**

Planned implementations:
- Jest for JavaScript unit tests
- PHPUnit for PHP unit tests
- Cypress/Playwright for E2E tests

### Manual Testing Checklist

Before each deployment, verify:

#### Functionality
- [ ] Calculator works with all repair types
- [ ] Form validation prevents invalid entries
- [ ] Email delivery works
- [ ] Telegram notifications work
- [ ] Rate limiting prevents spam
- [ ] Dark mode toggle works

#### User Experience
- [ ] Page loads without errors
- [ ] All links work
- [ ] Images load correctly
- [ ] Forms are user-friendly
- [ ] Mobile menu works
- [ ] CTAs are visible

#### Accessibility
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Forms are labeled properly
- [ ] Color contrast is sufficient (WCAG AA)
- [ ] Screen reader friendly (test with NVDA)

#### Performance
- [ ] Page loads in < 3 seconds
- [ ] No console errors
- [ ] Images are optimized
- [ ] No broken links

#### Security
- [ ] No sensitive data in HTML/JS
- [ ] CORS headers configured
- [ ] XSS protection active
- [ ] Rate limiting active
- [ ] .env file not exposed

---

## Security Checklist

### Before Deployment

- [ ] .env file contains real credentials (not default values)
- [ ] .env file is in .gitignore
- [ ] No API keys or passwords in code
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Input validation active
- [ ] Rate limiting active
- [ ] Error messages don't leak information

### Production Environment

- [ ] Error logging to file (not displayed to users)
- [ ] Log files secured (not web-accessible)
- [ ] Regular backups configured
- [ ] Monitoring/alerting setup
- [ ] Incident response plan documented

---

## Performance Standards

### Core Web Vitals Targets

- **Largest Contentful Paint (LCP):** < 2.5s
- **First Input Delay (FID):** < 100ms
- **Cumulative Layout Shift (CLS):** < 0.1

### Optimization Checklist

- [ ] Images optimized (use WebP)
- [ ] CSS minified
- [ ] JavaScript minified
- [ ] Unused code removed
- [ ] Lazy loading implemented
- [ ] Caching configured
- [ ] CDN in use (if available)

---

## Accessibility Standards (WCAG 2.1 Level AA)

### Required Standards

1. **Perceivable**
   - Text alternatives for images
   - Audio/video captions
   - Sufficient color contrast (4.5:1 for text)
   - Text resizable up to 200%

2. **Operable**
   - Full keyboard navigation
   - No keyboard traps
   - Focus visible at all times
   - Sufficient time for interactions
   - No seizure-inducing content

3. **Understandable**
   - Clear and simple language
   - Consistent navigation
   - Error prevention and recovery
   - Help and documentation available

4. **Robust**
   - Valid HTML markup
   - Proper ARIA usage
   - Compatible with assistive technologies

---

## Git Workflow

### Branch Naming
```
feature/calculator-improvement
bugfix/email-validation
docs/update-readme
```

### Commit Messages
```
✅ Good:
- "Add dark mode support"
- "Fix email validation regex"
- "Improve rate limiting error messages"

❌ Avoid:
- "Update" (too vague)
- "Fix it" (unclear what)
- "asdf" (not descriptive)
```

### Code Review Checklist

Before merging:
- [ ] Code follows standards
- [ ] No console.log() or debug code
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] No sensitive data exposed
- [ ] Accessibility maintained

---

## Documentation Standards

### Code Comments

✅ **Good Comments:**
```javascript
// Calculate wall area accounting for doors/windows
const wallArea = perimeter * ceiling - doorArea - windowArea;

// Email retries with exponential backoff
for (let attempt = 1; attempt <= maxRetries; attempt++) {
```

❌ **Bad Comments:**
```javascript
const x = 100; // This is one hundred
const p = r * c; // Multiply r and c
```

### Function Documentation

```php
/**
 * Send email via SMTP with retry logic
 *
 * @param array $config SMTP configuration
 * @param string $name Client name
 * @param string $phone Client phone
 * @return array ['success' => bool, 'message' => string]
 * @throws Exception if config invalid
 */
function sendViaSMTP(array $config, string $name, string $phone): array {
```

---

## Environment Configuration

### .env File Requirements

Never commit .env file. Use .env.example instead.

Required variables:
```
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_TO=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### Local Development Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Fill in your credentials
nano .env

# 3. Test email setup
php test-mail-fix.php

# 4. Start local server
php -S localhost:8000
```

---

## Review Checklist for New Features

Before deploying new features:

### Code Quality
- [ ] Follows coding standards
- [ ] No debug/console statements
- [ ] Proper error handling
- [ ] No hardcoded values

### Functionality
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] Error cases handled
- [ ] Tested on mobile/desktop

### Security
- [ ] Input validation present
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] No SQL injection possible

### Performance
- [ ] No unnecessary API calls
- [ ] Efficient DOM manipulation
- [ ] Images optimized
- [ ] Lazy loading where appropriate

### Accessibility
- [ ] Keyboard navigable
- [ ] Screen reader friendly
- [ ] Proper color contrast
- [ ] Focus visible

### Documentation
- [ ] Code commented
- [ ] README updated
- [ ] .env.example updated
- [ ] Change log entry added

---

## Common Issues & Solutions

### Issue: Form Spam
- **Solution:** Implement reCAPTCHA
- **Priority:** High
- **Timeline:** This month

### Issue: Slow Email Delivery
- **Solution:** Implement async queue (Bull/Beanstalkd)
- **Priority:** Medium
- **Timeline:** Next quarter

### Issue: Code Difficult to Maintain
- **Solution:** Extract to separate files/components
- **Priority:** Medium
- **Timeline:** Next major version

---

## Resources

- [MDN Web Docs](https://developer.mozilla.org/)
- [PHP Manual](https://www.php.net/manual/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Google Web Fundamentals](https://developers.google.com/web/fundamentals/)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)

---

**Last Updated:** April 21, 2026  
**Next Review:** July 21, 2026
 overview
