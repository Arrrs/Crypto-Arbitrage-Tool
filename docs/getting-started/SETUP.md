# Setup Instructions

## Quick Start

Follow these steps to get your application up and running:

### 1. Database Setup

Make sure PostgreSQL is running and the database `webapp_dev1` exists:

```bash
# If you need to create the database (using psql):
psql -U postgres -c "CREATE DATABASE webapp_dev1;"
```

### 2. Environment Variables

The `.env` file is already configured with your database credentials:
- Database: webapp_dev1
- Host: localhost
- Port: 5432
- User: postgres
- Password: password

**IMPORTANT**: Before deploying to production, change the `AUTH_SECRET` in `.env` to a secure random string!

```bash
# Generate a new secret (run this and update .env):
openssl rand -base64 32
```

### 3. Database Migration

Run Prisma migrations to create all database tables:

```bash
npx prisma migrate dev
```

### 4. Seed Database

Create test users (optional but recommended for testing):

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Regular user: `user@example.com` / `user123`

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Test Accounts

After seeding, you can login with:

### Admin Account
- Email: `admin@example.com`
- Password: `admin123`
- Access: Full admin dashboard + user management

### Regular User Account
- Email: `user@example.com`
- Password: `user123`
- Access: User dashboard and profile

## Features to Test

1. **Public Pages**
   - Visit homepage (/) - should see landing page
   - Try to access /dashboard without login - should redirect to /login

2. **Authentication**
   - Sign up with a new account at /signup
   - Login at /login
   - Logout from navbar menu

3. **User Features**
   - View dashboard at /dashboard
   - Edit profile at /profile
   - Change password at /profile

4. **Admin Features** (login as admin)
   - Access admin dashboard at /admin
   - View all users
   - Edit user details (name, email, role)
   - Delete users (except yourself)

## Prisma Studio

To view and manage your database visually:

```bash
npx prisma studio
```

Opens at [http://localhost:5555](http://localhost:5555)

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database `webapp_dev1` exists

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset
npm run db:seed
```

## Production Deployment

Before deploying:

1. Change `AUTH_SECRET` in `.env`
2. Update `AUTH_URL` to your production domain
3. Use a production PostgreSQL database
4. Enable SSL for database connection
5. Set secure environment variables
6. Run `npm run build` to test production build

```bash
npm run build
npm start
```

## Next Steps

- Add email verification
- Implement password reset
- Add OAuth providers (Google, GitHub, etc.)
- Add user avatar upload
- Implement activity logging
- Add rate limiting to API routes
