import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';

/**
 * Recebe o formulário do site e o entrega ao SuiteOps, assinado.
 *
 * **Roda no servidor, e é por isso que existe.** O endpoint do app autentica
 * por HMAC do corpo com o segredo da unidade de negócio, e segredo não pode
 * viver no JavaScript do navegador — com ele, qualquer um cadastraria lead em
 * nome da unidade. O site é estático; esta rota é a única peça que o Vercel
 * executa, e é onde o segredo fica.
 */
export const prerender = false;

/** O header que o `VerifyBusinessUnitSignature` do app confere. */
const SIGNATURE_HEADER = 'X-SuiteOps-Signature';

type Payload = {
  nome?: unknown;
  email?: unknown;
  telefone?: unknown;
  empresa?: unknown;
  tipo_operacao?: unknown;
  tamanho_equipe?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_term?: unknown;
  utm_content?: unknown;
  /** Campo-armadilha: só robô preenche. */
  website?: unknown;
};

const texto = (valor: unknown, max: number): string | null => {
  if (typeof valor !== 'string') {
    return null;
  }

  const limpo = valor.trim();

  return limpo === '' ? null : limpo.slice(0, max);
};

/** Os rótulos como a pessoa os leu na tela — é assim que eles chegam à ficha. */
const OPERACAO: Record<string, string> = {
  locacao: 'Empresa de Locação (Equipamentos, Máquinas, Ativos)',
  servicos: 'Prestação de Serviços Técnicos / Engenharia',
  consultoria: 'Consultoria, Assessoria ou BPO',
  automacao: 'Agência de Automação / Marketing',
  software_house: 'Software House / Dev Shop',
  outra: 'Outro modelo de serviços e contratos',
};

const EQUIPE: Record<string, string> = {
  '1-3': '1 a 3 pessoas',
  '4-10': '4 a 10 pessoas',
  '11-25': '11 a 25 pessoas',
  '26+': 'Mais de 25 pessoas',
};

const json = (corpo: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  const unit = import.meta.env.SUITEOPS_UNIT_UUID;
  const pipeline = import.meta.env.SUITEOPS_PIPELINE_UUID;
  const secret = import.meta.env.SUITEOPS_FORM_SECRET;
  const appUrl = import.meta.env.SUITEOPS_APP_URL || import.meta.env.PUBLIC_APP_URL;

  // Falta de configuração é erro de quem mantém o site, não de quem preencheu:
  // some da tela do visitante e aparece no log do deploy.
  if (!unit || !secret || !appUrl) {
    console.error('[lead] faltam SUITEOPS_UNIT_UUID, SUITEOPS_FORM_SECRET ou SUITEOPS_APP_URL');

    return json({ ok: false, erro: 'indisponivel' }, 503);
  }

  let corpo: Payload;

  try {
    corpo = (await request.json()) as Payload;
  } catch {
    return json({ ok: false, erro: 'payload' }, 400);
  }

  // Armadilha: o campo é invisível na tela, então só robô o preenche. Responde
  // 200 de propósito — dizer "recusado" ensina o robô a tentar de outro jeito.
  if (texto(corpo.website, 200) !== null) {
    return json({ ok: true }, 200);
  }

  const nome = texto(corpo.nome, 160);
  const email = texto(corpo.email, 255);
  const telefone = texto(corpo.telefone, 30);
  const empresa = texto(corpo.empresa, 160);

  // As mesmas exigências do app, conferidas aqui para o visitante receber a
  // recusa na hora em vez de um erro genérico vindo de longe.
  if (nome === null || (email === null && telefone === null)) {
    return json({ ok: false, erro: 'campos' }, 422);
  }

  const operacao = texto(corpo.tipo_operacao, 40);
  const equipe = texto(corpo.tamanho_equipe, 40);

  /*
   * As três perguntas de qualificação vão como respostas do formulário, que é
   * onde a ficha do lead as mostra e de onde a leitura do negócio por IA as lê.
   * Guardadas com o rótulo que a pessoa viu, e não com a chave do `select`:
   * "software_house" não diz nada para quem abre a ficha meses depois.
   */
  const answers = [
    empresa === null ? null : { label: 'Empresa', value: empresa },
    operacao === null ? null : { label: 'Tipo de operação', value: OPERACAO[operacao] ?? operacao },
    equipe === null ? null : { label: 'Tamanho da equipe', value: EQUIPE[equipe] ?? equipe },
  ].filter((linha): linha is { label: string; value: string } => linha !== null);

  const payload: Record<string, unknown> = {
    unit,
    name: nome,
    email,
    phone: telefone,
    // O título é o que distingue os cards no quadro; sem ele, uma fila de
    // "Demonstração" sem nome de empresa.
    title: empresa === null ? 'Demonstração pelo site' : `Demonstração — ${empresa}`,
    answers,
    utm_source: texto(corpo.utm_source, 255),
    utm_medium: texto(corpo.utm_medium, 255),
    utm_campaign: texto(corpo.utm_campaign, 255),
    utm_term: texto(corpo.utm_term, 255),
    utm_content: texto(corpo.utm_content, 255),
  };

  if (pipeline) {
    payload.pipeline = pipeline;
  }

  // O corpo é assinado **exatamente como vai no fio**: a HMAC do app é sobre os
  // bytes recebidos, então serializar duas vezes (uma para assinar, outra para
  // enviar) arriscaria assinar algo diferente do que foi enviado.
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  try {
    const resposta = await fetch(`${appUrl.replace(/\/$/, '')}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        [SIGNATURE_HEADER]: signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!resposta.ok) {
      // O lead vai para o log do Vercel para poder ser recuperado à mão: numa
      // função sem disco, é o único lugar que sobrevive à requisição. Perder o
      // contato é pior que registrá-lo aqui — mas é dado pessoal, então só no
      // caminho de falha.
      console.error('[lead] o app recusou', resposta.status, body);

      return json({ ok: false, erro: 'app' }, 502);
    }
  } catch (erro) {
    console.error('[lead] o app não respondeu', erro, body);

    return json({ ok: false, erro: 'app' }, 502);
  }

  return json({ ok: true }, 201);
};
