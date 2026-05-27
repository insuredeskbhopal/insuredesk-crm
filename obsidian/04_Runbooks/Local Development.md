# Local Development

## Start Dev Server

```powershell
npm run dev
```

## Validate

```powershell
npm run lint
npm run build
```

If build gets stale chunk errors:

```powershell
npm run build:clean
```

## Seed Super Admin

```powershell
node prisma/seed.js
```
