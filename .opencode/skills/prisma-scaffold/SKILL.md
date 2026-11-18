---
name: prisma-scaffold
description: Gera modelos Prisma, repositories, services, schemas Zod e API routes CRUD seguindo Clean Architecture. Use ao criar uma nova entidade de banco.
---

# Prisma Scaffold Skill

This skill helps developers scaffold new Prisma models, repositories, and services following Clean Architecture patterns.

## When to Use This Skill
- Creating new database entities with Prisma.
- Generating repository pattern for data access.
- Creating service layer for business logic.
- Adding validation schemas with Zod.
- Setting up API routes for CRUD operations.

## When NOT to Use This Skill
- Modifying existing models without migration strategy.
- Deploying to production databases.
- Running migrations without backup.
- Writing business logic that belongs in use-cases.

## Prerequisites

This project uses:
- **Prisma 5.22+** with PostgreSQL
- **Zod** for validation schemas
- **Clean Architecture** with `src/features/` pattern
- **Repository Pattern** with interfaces

## Workflow Phases

### Phase 1: Define Model
1. Identify the entity name (e.g., `Category`, `Budget`, `Goal`)
2. Determine fields, types, and relationships
3. Check existing models for reference patterns

### Phase 2: Generate Prisma Model
Add to `prisma/schema.prisma`:
```prisma
model <EntityName> {
  id          String   @id @default(cuid())
  // Add fields here
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("<table_name>")
}
```

### Phase 3: Generate Repository
Create `src/features/<feature>/<EntityName>Repository.ts`:
```typescript
import { PrismaClient } from "@prisma/client"
import { I<EntityName>Repository } from "./I<EntityName>.repository"

export class Prisma<EntityName>Repository implements I<EntityName>Repository {
  constructor(private prisma: PrismaClient) {}
  
  async findById(id: string): Promise<Entity | null> {
    return this.prisma.<entityName>.findUnique({ where: { id } })
  }
  
  async findAllByUser(userId: string): Promise<Entity[]> {
    return this.prisma.<entityName>.findMany({ where: { userId } })
  }
  
  async create(data: CreateEntityDTO): Promise<Entity> {
    return this.prisma.<entityName>.create({ data })
  }
  
  async update(id: string, data: UpdateEntityDTO): Promise<Entity> {
    return this.prisma.<entityName>.update({ where: { id }, data })
  }
  
  async delete(id: string): Promise<void> {
    await this.prisma.<entityName>.delete({ where: { id } })
  }
}
```

### Phase 4: Generate Interface
Create `src/features/<feature>/I<EntityName>.repository.ts`:
```typescript
export interface I<EntityName>Repository {
  findById(id: string): Promise<Entity | null>
  findAllByUser(userId: string): Promise<Entity[]>
  create(data: CreateEntityDTO): Promise<Entity>
  update(id: string, data: UpdateEntityDTO): Promise<Entity>
  delete(id: string): Promise<void>
}
```

### Phase 5: Generate Service
Create `src/features/<feature>/<EntityName>.service.ts`:
```typescript
import { I<EntityName>Repository } from "./I<EntityName>.repository"

export class <EntityName>Service {
  constructor(private repository: I<EntityName>Repository) {}
  
  async getById(id: string): Promise<Entity> {
    const entity = await this.repository.findById(id)
    if (!entity) throw new Error("Entity not found")
    return entity
  }
  
  async getAllByUser(userId: string): Promise<Entity[]> {
    return this.repository.findAllByUser(userId)
  }
  
  async create(userId: string, data: CreateEntityDTO): Promise<Entity> {
    return this.repository.create({ ...data, userId })
  }
  
  async update(id: string, data: UpdateEntityDTO): Promise<Entity> {
    return this.repository.update(id, data)
  }
  
  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }
}
```

### Phase 6: Generate Zod Schema
Create `src/features/<feature>/schemas/<entity>.schema.ts`:
```typescript
import { z } from "zod"

export const <Entity>Schema = z.object({
  id: z.string().cuid(),
  // Add fields
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const Create<Entity>Schema = z.object({
  // Add create-only fields
})

export const Update<Entity>Schema = z.object({
  // Add updatable fields (all optional)
}).partial()
```

### Phase 7: Generate API Route
Create `src/app/api/<feature>/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { container } from "@/core/container"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const entities = await container.<entityName>Service.getAllByUser(session.user.id)
  return NextResponse.json(entities)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const body = await request.json()
  // Validate with Zod
  
  const entity = await container.<entityName>Service.create(session.user.id, body)
  return NextResponse.json(entity, { status: 201 })
}
```

## Tool Usage & Permissions
- Allowed: `read`, `glob`, `grep` (to find existing patterns), `write`, `edit` (for generated files).
- Prohibited: Direct database writes, migration execution without user approval.

## Execution Guidelines
- Always follow existing naming conventions (PascalCase for classes, camelCase for methods).
- Use absolute imports (`@/features/...`, `@/core/...`).
- Add proper TypeScript types for all DTOs.
- Include indexes for frequently queried fields.

## Quality Assurance
- Run `npx prisma generate` after model changes.
- Run `npx prisma validate` to check schema.
- Run `npm run lint` before committing.
- Add tests in `__tests__/` folder following project patterns.

## Common Patterns

### One-to-Many
```prisma
model Parent {
  id        String   @id @default(cuid())
  children  Child[]
}

model Child {
  id        String @id @default(cuid())
  parentId  String
  parent    Parent @relation(fields: [parentId], references: [id])
}
```

### Many-to-Many
```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  transactions Transaction[]
}

model Transaction {
  id          String     @id @default(cuid())
  categories  Category[]
}
```

### Decimal Fields
```prisma
value Decimal @db.Decimal(12, 2)
```

## Related Commands
```bash
npx prisma generate    # Generate Prisma Client
npx prisma db push     # Push schema to DB (dev only)
npx prisma studio      # Open DB GUI
npx prisma migrate dev # Create migration
```