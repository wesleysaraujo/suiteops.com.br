/**
 * Configurações e constantes centrais do site SuiteOps.
 */

export const SITE = {
  name: 'SuiteOps',
  title: 'SuiteOps — Onde empresas de serviços, locação e projetos vendem, entregam e cobram sabendo de onde veio cada número',
  description:
    'A operação completa para empresas de serviços, locação, consultorias e projetos em um sistema só: do primeiro toque no funil à margem líquida e gestão de contratos com relógio de prazos e reajustes. 100% nativo para agentes de IA via MCP.',
  url: 'https://www.suiteops.com.br',
  appUrl: 'https://app.suiteops.com.br',
  loginUrl: 'https://app.suiteops.com.br/login',
  registerUrl: 'https://app.suiteops.com.br/register',
  whatsappUrl:
    'https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20conhecer%20o%20SuiteOps%20para%20minha%20empresa.',
  email: 'contato@suiteops.com.br',
  company: 'TechBlues Tecnologia e Automações',
  companyUrl: 'https://techblues.com.br',
};

/**
 * O que o MCP do app expõe hoje. **Único lugar** com esses números: o site é
 * estático e não enxerga o app, então a contagem mora aqui e muda junto com
 * `McpCatalog` (app.suiteops/app/Services/Mcp/McpCatalog.php), que é a fonte
 * real. Conferir: `php artisan test --filter=McpGuideTest` no app.
 */
export const MCP = {
  funil: 15,
  comercial: 7,
  projetos: 7,
  automacoes: 5,
  notas: 4,
  servers: 5,
  get tools() {
    return this.funil + this.comercial + this.projetos + this.automacoes + this.notas;
  },
};

export type NavLink = {
  label: string;
  href: string;
  badge?: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: 'Cockpit', href: '#perguntas' },
  { label: 'Capacidades', href: '#capacidades' },
  { label: 'Agentes & MCP', href: '#mcp', badge: 'IA' },
  { label: 'Multiunidades', href: '#unidades' },
  { label: 'Diferenciais', href: '#comparativo' },
  { label: 'Segmentos', href: '#para-quem' },
  { label: 'FAQ', href: '#faq' },
];
