# User Management

## Route

```text
/admin/users
```

## Files

```text
app/(dashboard)/admin/users/page.js
app/components/users/UserManagement.js
app/api/users/route.ts
app/api/users/[id]/route.ts
lib/userManagementPermissions.ts
```

## Role Access

- `SUPER_ADMIN`
- `ADMIN`
- `MANAGER`

Hidden from:

- `AGENT`
- `VIEWER`
