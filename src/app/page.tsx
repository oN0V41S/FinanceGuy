import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Wallet, 
  PieChart, 
  TrendingUp, 
  CreditCard, 
  Shield, 
  ArrowRight 
} from "lucide-react";
import { LogoMark } from "@/components/ui/logo-mark";

const features = [
  {
    icon: Wallet,
    title: "Controle Total",
    description: "Gerencie suas receitas e despesas em um só lugar com facilidade."
  },
  {
    icon: PieChart,
    title: "Categorização Inteligente",
    description: "Organize suas transações por categorias personalizadas."
  },
  {
    icon: TrendingUp,
    title: "Análises Detalhadas",
    description: "Visualize gráficos e relatórios para entender suas finanças."
  },
  {
    icon: CreditCard,
    title: "Controle de Parcelas",
    description: "Acompanhe compras parceladas e evite surpresas no orçamento."
  },
  {
    icon: Shield,
    title: "Segurança em Primeiro Lugar",
    description: "Seus dados protegidos com criptografia de ponta."
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-outline-variant bg-surface-container/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <LogoMark className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl font-sans">FinanceGuy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Cadastrar</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            Sua gestão financeira pessoal
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold font-sans mb-6 leading-tight bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
            FinanceGuy
            <span className="block text-primary">simplificado e inteligente</span>
          </h1>
          
          <p className="text-xl text-foreground/70 mb-10 max-w-2xl mx-auto">
            Tome o controle das suas finanças pessoais com uma ferramenta poderosa, 
            fácil de usar e que se adapta às suas necessidades.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                Já tenho conta
              </Button>
            </Link>
          </div>
          
            <p className="mt-4 text-sm text-neutral">
            Sem cartão de crédito obrigatório • Comece em menos de 1 minuto
          </p>
        </div>
      </section>

      <section className="py-20 px-4 bg-surface-container">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-sans text-foreground mb-4">
              Tudo o que você precisa para organizar suas finanças
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Funcionalidades pensadas para facilitar sua vida e ajudar você a alcançar seus objetivos financeiros.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 hover:border-outline-variant/40 transition-all duration-300 shadow-soft"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold font-sans text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-foreground/70">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-primary rounded-xl p-8 md:p-12 text-center border-none shadow-soft">
            <h2 className="text-3xl md:text-4xl font-bold font-sans text-white mb-6">
              Pronto para transformar sua vida financeira?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de pessoas que já estão tomando controle das suas finanças com o FinanceGuy.
            </p>
            <Link href="/register">
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-base px-8 py-6"
              >
                Criar Conta Grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      <footer className="border-t border-outline-variant py-12 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                <LogoMark className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold font-sans text-foreground">FinanceGuy</span>
            </div>
            <p className="text-sm text-neutral">
              © 2026 FinanceGuy. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}