# 🏦 Identidade Visual: FinanceGuy

**Versão**: 1.0 | **Data**: Março 2026 | **Status**: Proposta

---

## 1. Conceito Central
A marca deve transmitir **segurança** e **clareza**. O design é focado em reduzir a "fadiga cognitiva" ao lidar com números, utilizando espaços em branco generosos e uma hierarquia visual nítida.

*   **Palavras-chave:** Minimalismo, Precisão, Confiança, Fluidez.

---

## 2. Paleta de Cores (Linear Financial Dark Mode)
A interface utiliza uma paleta Dark Mode otimizada para legibilidade de dados financeiros.
| Uso | Hexadecimal |
| :--- | :--- |
| **Primária** | `#2563EB` (Trust Blue) |
| **Secundária** | `#8B5CF6` (Insight Violet) |
| **Fundo (Canvas)** | `#131315` (Deep Ink) |
| **Sucesso** | `#10B981` (Success Mint) |
| **Muted** | `#787679` (Muted Gray) |

## 3. Tipografia
*   **Headings/Body:** `Inter`.
*   **Labels/UI Elements:** `Space Grotesk`.
*   **Monospaced (Finance):** `JetBrains Mono`.

---

## 4. Logotipo (Conceito)
**Símbolo:** Um escudo minimalista formado pela intersecção de dois gráficos de barras de alturas diferentes, sugerindo o equilíbrio entre *Income* e *Expense*.
**Logotipo:** "FinanceGuy" (FinanceGuy em peso 400, ou uso单一 do nome completo).

---

## 5. Elementos Visuais e UI (Design System)
Para alinhar com a **Clean Architecture** do backend:

*   **Bordas:** Arredondamento suave (`border-radius: 0.75rem`) para transmitir acessibilidade.
*   **Sombras:** `Soft Shadows` (0 4px 6px -1px rgb(0 0 0 / 0.1)) para dar profundidade sem poluir.
*   **Iconografia:** Linhas finas (Lucide React) para manter a leveza.
*   **Empty States:** Ilustrações em tons de cinza (Slate 200) para quando não houver transações.

---

## 6. Guia de Aplicação (Tailwind Config)
Sugestão para o arquivo `tailwind.config.ts`:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2563EB',
          secondary: '#8B5CF6',
          background: '#F8FAFC',
        },
        finance: {
          income: '#10B981',
          expense: '#E11D48',
          recurring: '#F59E0B',
        }
      }
    }
  }
}
```

---

## 7. Tom de Voz (UX Writing)
*   **Direto:** "Transação salva com sucesso" em vez de "Seus dados foram processados".
*   **Transparente:** Explicar por que uma transação é recorrente ou parcelada.
*   **Seguro:** Mensagens de erro claras que ajudam o usuário a corrigir a entrada (via validação Zod).

---

## 8. Design de Formulários de Autenticação

Esta seção define as especificações de design para os formulários de autenticação (Login e Registro) seguindo os padrões **shadcn-ui**.

### 8.1 Especificações de Layout dos Formulários

#### Estrutura Geral

Os formulários de autenticação devem seguir uma estrutura vertical organizada, com espaçamento consistente entre os elementos. O container do formulário deve ter uma largura máxima de `400px` (max-w-md) para manter a legibilidade e o foco.

| Elemento | Especificação |
| :--- | :--- |
| **Container do formulário** | max-w-md, centered, padding p-8 |
| **Espaçamento entre campos** | mb-4 (16px) |
| **Espaçamento entre grupo de campos** | mb-6 (24px) |
| **Título do formulário** | text-2xl, font-semibold, mb-6 |
| **Link de recuperação/cadastro** | text-sm, mt-4, text-center |

#### Posicionamento e Estilização de Labels

As labels devem estar posicionadas acima dos campos de entrada, seguindo o padrão de acessibilidade. Utilize o componente `FormField` do shadcn-ui para garantir consistência.

```tsx
// Estrutura recomendada para label
<Label htmlFor="email" className="text-brand-secondary font-medium">
  Endereço de e-mail
</Label>
```

**Especificações da Label:**

| Propriedade | Valor |
| :--- | :--- |
| **Posição** | Acima do input |
| **Fonte** | Inter, 14px (text-sm), peso 500 |
| **Cor** | Slate (#334155 - brand.secondary) |
| **Margem inferior** | mb-2 (8px) |

---

### 8.2 Especificações dos Campos de Entrada (Input)

O componente de entrada deve seguir as especificações abaixo para manter consistência visual em toda a aplicação.

#### Dimensões e Espaçamento

```tsx
// Input base - especificações exatas
<Input
  id="email"
  type="email"
  placeholder="seu@email.com"
  className="h-12 px-4 rounded-xl border-gray-200"
/>
```

| Propriedade | Valor | Classe Tailwind |
| :--- | :--- | :--- |
| **Altura** | 48px | `h-12` |
| **Padding horizontal** | 16px | `px-4` |
| **Border radius** | 12px (0.75rem) | `rounded-xl` |
| **Borda padrão** | cinza claro | `border-gray-200` |
| **Fonte do placeholder** | Inter, 14px, cinza | `placeholder:text-gray-400` |

#### Estados do Campo de Entrada

| Estado | Borda | Fundo | Sombra |
| :--- | :--- | :--- | :--- |
| **Padrão** | border-gray-200 | bg-white | nenhuma |
| **Foco** | border-brand-primary (#2563EB) | bg-white | `ring-2 ring-brand-primary/20` |
| **Erro** | border-finance-expense (#E11D48) | bg-finance-expense/5 | nenhuma |
| **Desabilitado** | border-gray-100 | bg-gray-50 | nenhuma |
| **Sucesso** | border-finance-income (#10B981) | bg-white | nenhuma |

#### Estilização do Estado de Foco

O estado de foco deve usar a cor primária da marca para reforçá-la visualmente:

```tsx
// Classe completa para Input com foco
className="h-12 px-4 rounded-xl border-gray-200 
focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 
focus:outline-none transition-all duration-200"
```

---

### 8.3 Mensagens de Erro

As mensagens de erro devem aparecer abaixo do campo de entrada, com iconografia de alerta e formatação consistente.

```tsx
// Estrutura de mensagem de erro
<FormMessage className="text-finance-expense text-sm mt-2 flex items-center gap-1.5">
  <X className="w-4 h-4" />
  Mensagem de erro aqui
</FormMessage>
```

| Propriedade | Valor |
| :--- | :--- |
| **Fonte** | Inter, 14px (text-sm) |
| **Cor** | Rosewood (#E11D48 - finance.expense) |
| **Icone** | X da biblioteca Lucide, w-4 h-4 |
| **Espaçamento** | mt-2 (8px) acima, gap-1.5 (6px) entre ícone e texto |
| **Alinhamento** | Esquerda |

---

### 8.4 Design do Botão de Submissão

O botão de submissão deve ser o elemento de ação principal do formulário, com visual proeminente e feedback claro de interação.

```tsx
// Botão primário - especificações exatas
<Button 
  type="submit"
  className="w-full h-12 rounded-xl bg-brand-primary 
  hover:bg-brand-primary/90 text-white font-medium"
>
  Entrar na conta
</Button>
```

| Propriedade | Valor | Classe Tailwind |
| :--- | :--- | :--- |
| **Largura** | 100% | `w-full` |
| **Altura** | 48px | `h-12` |
| **Border radius** | 12px | `rounded-xl` |
| **Cor de fundo** | Trust Blue (#2563EB) | `bg-brand-primary` |
| **Cor do texto** | Branco | `text-white` |
| **Peso da fonte** | 500 | `font-medium` |
| **Transição** | 200ms | `transition-colors` |

#### Estados do Botão

| Estado | Fundo | Texto | Comportamento |
| :--- | :--- | :--- | :--- |
| **Padrão** | #2563EB | branco | cursor pointer |
| **Hover** | #2563EB/90 | branco | escurecer 10% |
| **Foco** | #2563EB | branco | ring-2 ring-brand-primary/40 |
| **Ativo/Press** | #2563EB/80 | branco | scale-98 |
| **Desabilitado** | #2563EB/50 | branco/50 | cursor not-allowed |
| **Loading** | #2563EB | branco | opacity-80 |

---

### 8.5 Estrutura do Formulário de Login

O formulário de login deve conter os campos essenciais para autenticação do usuário.

```tsx
// Estrutura completa do Login Form
<Card className="w-full max-w-md p-8">
  <CardHeader className="text-center">
    <CardTitle className="text-2xl font-semibold text-brand-secondary">
      Bem-vindo de volta
    </CardTitle>
    <CardDescription className="text-gray-500">
      Entre na sua conta para continuar
    </CardDescription>
  </CardHeader>
  
  <form>
    <CardContent className="space-y-4">
      {/* Campo E-mail */}
      <FormField
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Endereço de e-mail</FormLabel>
            <FormControl>
              <Input 
                placeholder="seu@email.com" 
                type="email"
                className="h-12 px-4 rounded-xl"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Campo Senha */}
      <FormField
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Senha</FormLabel>
            <FormControl>
              <Input 
                placeholder="••••••••" 
                type="password"
                className="h-12 px-4 rounded-xl"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CardContent>
    
    <CardFooter className="flex flex-col gap-4">
      <Button type="submit" className="w-full h-12 rounded-xl">
        Entrar na conta
      </Button>
      
      <div className="text-center text-sm text-gray-500">
        Não tem uma conta?{" "}
        <Link to="/register" className="text-brand-primary hover:underline">
          Criar conta
        </Link>
      </div>
    </CardFooter>
  </form>
</Card>
```

#### Campos do Formulário de Login

| Campo | Tipo | Obrigatório | Validação |
| :--- | :--- | :--- | :--- |
| **E-mail** | email | Sim | Zod email validation |
| **Senha** | password | Sim | Mínimo 6 caracteres |

---

### 8.6 Estrutura do Formulário de Registro

O formulário de registro deve incluir campos adicionais para criação de conta, com validação de força de senha.

```tsx
// Estrutura completa do Register Form
<Card className="w-full max-w-md p-8">
  <CardHeader className="text-center">
    <CardTitle className="text-2xl font-semibold text-brand-secondary">
      Criar nova conta
    </CardTitle>
    <CardDescription className="text-gray-500">
      Preencha seus dados para começar
    </CardDescription>
  </CardHeader>
  
  <form>
    <CardContent className="space-y-4">
      {/* Campo Nome */}
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome completo</FormLabel>
            <FormControl>
              <Input 
                placeholder="João Silva" 
                className="h-12 px-4 rounded-xl"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Campo E-mail */}
      <FormField
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Endereço de e-mail</FormLabel>
            <FormControl>
              <Input 
                placeholder="seu@email.com" 
                type="email"
                className="h-12 px-4 rounded-xl"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Campo Senha com Indicador de Força */}
      <FormField
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Senha</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  placeholder="••••••••" 
                  type="password"
                  className="h-12 px-4 pr-12 rounded-xl"
                  {...field}
                />
                {/* Indicador de validação */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {field.value?.length >= 6 ? (
                    <Check className="w-5 h-5 text-finance-income" />
                  ) : (
                    <X className="w-5 h-5 text-finance-expense" />
                  )}
                </div>
              </div>
            </FormControl>
            
            {/* Indicador de força da senha */}
            <PasswordStrengthIndicator password={field.value} />
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Campo Confirmação de Senha */}
      <FormField
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirmar senha</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  placeholder="••••••••" 
                  type="password"
                  className="h-12 px-4 rounded-xl"
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CardContent>
    
    <CardFooter className="flex flex-col gap-4">
      <Button type="submit" className="w-full h-12 rounded-xl">
        Criar conta
      </Button>
      
      <div className="text-center text-sm text-gray-500">
        Já tem uma conta?{" "}
        <Link to="/login" className="text-brand-primary hover:underline">
          Entrar
        </Link>
      </div>
    </CardFooter>
  </form>
</Card>
```

#### Campos do Formulário de Registro

| Campo | Tipo | Obrigatório | Validação |
| :--- | :--- | :--- | :--- |
| **Nome** | text | Sim | Mínimo 2 caracteres |
| **E-mail** | email | Sim | Formato válido de e-mail |
| **Senha** | password | Sim | Mínimo 6 caracteres |
| **Confirmar Senha** | password | Sim | Deve ser igual à senha |

---

### 8.7 Feedback Visual de Validação

O sistema de validação deve fornecer feedback imediato ao usuário através de indicadores visuais claros.

#### Indicadores de Validação em Tempo Real

```tsx
// Componente de ícone de validação
const ValidationIndicator = ({ isValid, message }: { isValid: boolean; message: string }) => {
  if (!message) return null;
  
  return (
    <div className={`flex items-center gap-1.5 text-sm ${
      isValid ? 'text-finance-income' : 'text-finance-expense'
    }`}>
      {isValid ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      )}
      <span>{message}</span>
    </div>
  );
};
```

#### Cores de Feedback

| Tipo | Cor | Hexadecimal | Uso |
| :--- | :--- | :--- | :--- |
| **Sucesso** | Success Mint | #10B981 | Campo válido, senha forte |
| **Erro** | Rosewood | #E11D48 | Campo inválido, senha fraca |
| **Aviso** | Amber | #F59E0B | Senha média, atenção necessária |

---

### 8.8 Indicador de Força de Senha

O indicador de força de senha deve fornecer feedback visual sobre a robustez da senha digitada.

```tsx
// Componente de indicador de força de senha
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const strength = calculatePasswordStrength(password);
  
  const levels = [
    { label: 'Fraca', color: 'bg-finance-expense', width: 'w-1/4' },
    { label: 'Média', color: 'bg-finance-recurring', width: 'w-2/4' },
    { label: 'Forte', color: 'bg-brand-primary', width: 'w-3/4' },
    { label: 'Muito Forte', color: 'bg-finance-income', width: 'w-full' },
  ];
  
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              index < strength.level 
                ? levels[strength.level - 1].color 
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${
        strength.level <= 1 ? 'text-finance-expense' :
        strength.level === 2 ? 'text-finance-recurring' :
        'text-finance-income'
      }`}>
        {strength.label}
      </p>
    </div>
  );
};
```

#### Níveis de Força

| Nível | Label | Cor | Critérios |
| :--- | :--- | :--- | :--- |
| **1** | Fraca | #E11B48 | Menos de 6 caracteres |
| **2** | Média | #F59E0B | 6+ caracteres OU letras + números |
| **3** | Forte | #2563EB | 8+ caracteres + letras + números |
| **4** | Muito Forte | #10B981 | 10+ caracteres + letras + números + símbolos |

---

### 8.9 Estados de Carregamento (Loading States)

O estado de carregamento deve ser exibido durante operações assíncronas, como submissão de formulário ou validação de dados.

#### Spinner de Carregamento

```tsx
// Spinner para botão de submissão
<Button 
  type="submit" 
  disabled={isLoading}
  className="w-full h-12 rounded-xl"
>
  {isLoading ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span>Entrando...</span>
    </>
  ) : (
    'Entrar na conta'
  )}
</Button>
```

| Propriedade | Valor |
| :--- | :--- |
| **Ícone** | Loader2 da biblioteca Lucide React |
| **Tamanho** | w-5 h-5 (20px) |
| **Animação** | animate-spin (spin 1s linear infinite) |
| **Cor** | inherit (herda a cor do botão) |
| **Espaçamento** | mr-2 (8px) entre ícone e texto |

#### Desabilitar Interação Durante Loading

```tsx
// Input desabilitado durante validação
<Input 
  disabled={isValidating}
  className="h-12 px-4 rounded-xl border-gray-200 
  disabled:opacity-50 disabled:cursor-not-allowed"
/>
```

---

### 8.10 Integração com shadcn-ui

Para garantir consistência, os formulários devem utilizar os componentes do shadcn-ui conforme a estrutura abaixo:

#### Instalação dos Componentes Necessários

```bash
npx shadcn@latest add form input button card label
```

#### Componentes shadcn-ui Utilizados

| Componente | Props Customizadas |
| :--- | :--- |
| **Form** | context, form (useForm) |
| **FormField** | name, render |
| **FormItem** | className="space-y-2" |
| **FormLabel** | className="text-brand-secondary font-medium" |
| **FormControl** | Wrap do Input |
| **FormMessage** | className="text-finance-expense text-sm" |
| **Input** | className="h-12 px-4 rounded-xl" |
| **Button** | className="w-full h-12 rounded-xl" |
| **Card** | className="w-full max-w-md p-8" |

---

### 8.11 Resumo de Classes Tailwind

#### Input

```css
/* Input padrão */
.h-12 px-4 rounded-xl border-gray-200 
focus:border-brand-primary focus:ring-2 
focus:ring-brand-primary/20 focus:outline-none 
transition-all duration-200

/* Input com erro */
.h-12 px-4 rounded-xl border-finance-expense 
bg-finance-expense/5

/* Input desabilitado */
.h-12 px-4 rounded-xl border-gray-100 
bg-gray-50 cursor-not-allowed
```

#### Button

```css
/* Button primário */
.w-full h-12 rounded-xl bg-brand-primary 
hover:bg-brand-primary/90 text-white 
font-medium transition-colors

/* Button desabilitado */
.w-full h-12 rounded-xl bg-brand-primary/50 
text-white/50 cursor-not-allowed
```

#### Label

```css
/* Label padrão */
.text-brand-secondary font-medium text-sm
```

---

*Seção adicionada em Março 2026 para padronização dos formulários de autenticação.*
