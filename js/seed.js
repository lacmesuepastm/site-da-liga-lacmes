// ============================================================================
// DADOS DE EXEMPLO — só usados no MODO DEMONSTRAÇÃO (config.js vazio).
// ============================================================================
import { hojeISO, somarDias } from './util.js';
import { getFasesPadrao, prefsPadrao } from './dominio.js';

export function popularDemo(Data) {
  if (!Data._vazio()) return;
  const h = hojeISO(), agora = Date.now(), min = 60000, dia = 86400000;
  const U = (id, nome, username, email, tipo, cargo, extra = {}) => [id, {
    nome, username, email, tipo, cargo, titulacao: tipo === 'orientador' ? 'Médica — Docente' : 'Graduando(a) em Medicina',
    vinculo: tipo === 'orientador' ? 'Orientação' : 'Membro', foto: '', ativo: true,
    eixosSeguidos: extra.eixos || ['clinica'], notifPrefs: prefsPadrao(), criadoEm: agora - 90 * dia
  }];
  const usuarios = Object.fromEntries([
    U('u1', 'Presidência LACMES', 'presidencia', 'presidencia@lacmes.org.br', 'admin', null),
    U('u2', 'Ana Beatriz Ferreira', 'ana.beatriz', 'ana.ferreira@lacmes.org.br', 'usuario', 'Diretor de Extensão', { eixos: ['cardio', 'geriatria'] }),
    U('u3', 'João Pedro Alves', 'joao.pedro', 'joao.alves@lacmes.org.br', 'usuario', 'Diretor de Pesquisa', { eixos: ['pneumo', 'infecto'] }),
    U('u4', 'Mariana Lima Cardoso', 'mariana.lima', 'mariana.lima@lacmes.org.br', 'usuario', 'Diretor de Ensino'),
    U('u5', 'Carlos Eduardo Souza', 'carlos.eduardo', 'carlos.souza@lacmes.org.br', 'usuario', 'Vice-presidente e Secretário'),
    U('u6', 'Fernanda Rocha Dias', 'fernanda.rocha', 'fernanda.rocha@lacmes.org.br', 'usuario', 'Diretor Financeiro'),
    U('u7', 'Lucas Almeida Torres', 'lucas.almeida', 'lucas.almeida@lacmes.org.br', 'usuario', 'Diretor de Comunicação'),
    U('u8', 'Beatriz Souza Martins', 'beatriz.souza', 'beatriz.souza@lacmes.org.br', 'usuario', 'Diretor de Estágios'),
    U('u9', 'Pedro Henrique Nogueira', 'pedro.henrique', 'pedro.nogueira@lacmes.org.br', 'usuario', null, { eixos: ['cardio', 'nefro'] }),
    U('u10', 'Júlia Martins Rêgo', 'julia.martins', 'julia.rego@lacmes.org.br', 'usuario', null, { eixos: ['endocrino'] }),
    U('u11', 'Dra. Andrea Leal Novaes', 'orientadora', 'andrea.novaes@uepa.br', 'orientador', null)
  ]);
  const senhas = { u1: 'lacmes2026', u2: 'extensao123', u3: 'pesquisa123', u4: 'ensino123', u5: 'secretaria123', u6: 'financas123', u7: 'comunica123', u8: 'estagio123', u9: 'membro123', u10: 'membro123', u11: 'orienta123' };

  const casoHTML = (t) => `<p>${t}</p>`;
  const dados = {
    _demo_senhas: { mapa: { mapa: senhas } },
    usuarios,
    config: {
      geral: { presidenteUid: 'u1', orientadoraUid: 'u11', orientadoraNome: 'Dra. Andrea Leal Novaes', areasEstagio: [], criadoEm: agora },
      publico: { inicializado: true }
    },
    projetos: {
      p1: {
        titulo: 'Grupo de Estudos em Insuficiência Cardíaca', categoria: 'Pesquisa', eixos: ['cardio', 'clinica'],
        desc: 'Grupo de estudos e revisão de literatura sobre manejo clínico da insuficiência cardíaca.',
        orientador: 'Prof. Dr. Ricardo Nunes', orientadorUid: null, idProj: 'PROJ-1', acesso: '', concluido: false, cargaHoraria: 0,
        membros: [{ uid: 'u2', papel: 'Orientador' }, { uid: 'u1', papel: 'Pesquisador' }, { uid: 'u9', papel: 'Coletador' }],
        membroIds: ['u2', 'u1', 'u9'],
        tarefas: [{ id: 't1', titulo: 'Revisar diretriz SBC 2025', desc: 'Resumo de 1 página com os pontos principais.', prazo: somarDias(h, 4), resp: ['u9'], concluida: false, criadoEm: agora - 2 * dia }],
        escala: { [somarDias(h, 2)]: { hora: '08:00', local: 'Ambulatório HRBA', equipe: ['u9'] } },
        arquivos: [{ id: 'a1', nome: 'Protocolo de pesquisa v2.pdf', url: 'https://example.com/protocolo.pdf', criadoEm: agora - 5 * dia, por: 'u2' }],
        reunioes: [{ id: 'r1', titulo: 'Alinhamento mensal', desc: 'Divisão dos artigos.', data: somarDias(h, 1), hora: '19:00', tipo: 'Online', link: 'https://meet.google.com/', local: '', concluida: false }],
        coleta: [], certificadosEnviados: [], criadoEm: agora - 30 * dia
      }
    },
    'projetos/p1/mensagens': {
      m1: { autor: 'u2', html: 'Pessoal, subi o protocolo atualizado: <span class="mencao mencao-file" data-mention="1" data-kind="file" data-id="a1">Protocolo de pesquisa v2.pdf</span>', criadoEm: agora - 3 * dia },
      m2: { autor: 'u9', html: 'Perfeito! <span class="mencao mencao-user" data-mention="1" data-kind="user" data-id="u2">@Ana Beatriz Ferreira</span> posso começar a coleta em <span class="mencao mencao-date" data-mention="1" data-kind="date" data-id="' + somarDias(h, 2) + '">' + somarDias(h, 2).split('-').reverse().join('/') + '</span>?', criadoEm: agora - 2 * dia }
    },
    oportunidades: {
      op1: { tipo: 'Extensão', eixos: ['cardio'], titulo: 'Ação de Educação em Saúde Cardiovascular na Comunidade Ribeirinha', descricao: 'Rodas de conversa e aferição de pressão arterial em comunidade ribeirinha do Baixo Amazonas.', orientador: 'Prof. Dr. Ricardo Nunes', local: 'Comunidade do Ituqui, Santarém - PA', link: '', vagas: 8, criadoPorCargo: 'Diretor de Extensão', criadoPor: 'u2', fases: getFasesPadrao('Extensão'), faseAtual: 0, inscritos: [], confirmados: [], atualizacoes: [], projetoId: null, criadoEm: agora - 4 * dia },
      op2: { tipo: 'Pesquisa', eixos: ['geriatria', 'clinica'], titulo: 'Prevalência de Depressão em Idosos Ribeirinhos de Santarém', descricao: 'Coleta de dados em UBS para avaliar sintomas depressivos em idosos.', orientador: 'Profa. Dra. Camila Reis', local: 'UEPA - Campus Santarém', link: '', vagas: 4, criadoPorCargo: 'Diretor de Pesquisa', criadoPor: 'u3', fases: getFasesPadrao('Pesquisa'), faseAtual: 1, inscritos: ['u9'], confirmados: [], atualizacoes: [], projetoId: null, criadoEm: agora - 10 * dia },
      op3: { tipo: 'Estágio', eixos: ['cardio'], titulo: 'Estágio de Observação — Ambulatório de Cardiologia', data: somarDias(h, 1), local: 'Hospital Regional do Baixo Amazonas', horaInicio: '08:00', horaFim: '12:00', vagas: 3, cargaHoraria: 4, orientacoes: 'Comparecer de jaleco, crachá da liga e estetoscópio. Apresentar-se na recepção às 07h45.', criadoPorCargo: 'Diretor de Estágios', criadoPor: 'u8', fases: getFasesPadrao('Estágio'), faseAtual: 1, inscritos: ['u9', 'u10'], confirmados: ['u9'], atualizacoes: [], projetoId: null, criadoEm: agora - 6 * dia },
      op4: { tipo: 'Estágio', eixos: ['emergencia'], titulo: 'Plantão observacional — Pronto-Socorro', data: somarDias(h, 6), local: 'UPA 24h Santarém', horaInicio: '19:00', horaFim: '23:00', vagas: 2, cargaHoraria: 4, orientacoes: '', criadoPorCargo: 'Diretor de Estágios', criadoPor: 'u8', fases: getFasesPadrao('Estágio'), faseAtual: 0, inscritos: [], confirmados: [], atualizacoes: [], projetoId: null, criadoEm: agora - dia }
    },
    aulas: {
      au1: { titulo: 'Semiologia Cardiovascular na Prática', professor: 'Prof. Dr. Ricardo Nunes', data: somarDias(h, 3), hora: '19:00', local: 'Auditório da UEPA / Google Meet', cargaHoraria: 2, eixos: ['cardio'], imagem: '', descHtml: '<p>Aula <b>teórico-prática</b> sobre ausculta cardíaca: bulhas, sopros e manobras.</p><ul><li>Traga seu estetoscópio</li><li>Leitura prévia: <i>Porto, cap. 12</i></li></ul>', seguidores: ['u9'], certificadosEnviados: [], criadoEm: agora - 2 * dia },
      au2: { titulo: 'Distúrbios Hidroeletrolíticos', professor: 'Dra. Paula Brito', data: somarDias(h, -7), hora: '18:30', local: 'Sala 4 — UEPA', cargaHoraria: 2, eixos: ['nefro', 'emergencia'], imagem: '', descHtml: '<p>Hiponatremia, hipercalemia e condutas na emergência.</p>', seguidores: ['u9', 'u10'], certificadosEnviados: [], criadoEm: agora - 12 * dia }
    },
    forum: {
      f1: { tipo: 'post', titulo: 'Bem-vindos ao novo portal da LACMES!', html: '<p>O portal agora tem <b>Fórum</b>, <b>Casos Clínicos</b> semanais, <i>eixos</i> por especialidade e notificações no celular. Instale o app pelo menu <u>Meu perfil</u>.</p>', eixos: ['clinica'], autor: 'u7', criadoEm: agora - 5 * dia, fixado: true, nComentarios: 1,
        enquete: { pergunta: 'Qual o melhor horário para as aulas da liga?', opcoes: ['18h30', '19h00', '19h30'], multipla: false, anonima: false, encerrada: false } },
      f2: { tipo: 'caso', titulo: 'Dispneia progressiva em idoso ribeirinho', eixos: ['cardio', 'pneumo'], autor: 'u3', criadoEm: agora - 1 * dia, casoDaSemana: true, ocultarAteComentar: true, nComentarios: 1,
        caso: {
          anamnese: [
            { titulo: 'Identificação', html: casoHTML('J.S., 72 anos, masculino, pescador aposentado, natural de Santarém-PA.'), aberto: true },
            { titulo: 'Queixa principal', html: casoHTML('"Falta de ar que piora quando deito" há 3 semanas.'), aberto: true },
            { titulo: 'História da doença atual', html: casoHTML('Dispneia aos moderados esforços evoluindo para pequenos esforços, ortopneia (2 travesseiros) e dispneia paroxística noturna. Refere edema vespertino em membros inferiores.'), aberto: true },
            { titulo: 'Antecedentes', html: casoHTML('HAS há 20 anos, uso irregular de losartana. Tabagista 40 maços-ano, cessou há 5 anos.'), aberto: false }
          ],
          exameFisico: [
            { titulo: 'Sinais vitais', html: casoHTML('PA 162×98 mmHg · FC 104 bpm · FR 24 irpm · SpO₂ 91% (ar ambiente) · Tax 36,4 °C'), aberto: true },
            { titulo: 'Aparelho cardiovascular', html: casoHTML('Ictus desviado para 6º EIC na linha axilar anterior. B3 presente. Sopro sistólico 2+/6+ em foco mitral.'), aberto: false },
            { titulo: 'Aparelho respiratório', html: casoHTML('Estertores crepitantes em terços inferiores bilateralmente.'), aberto: false }
          ],
          exames: [
            { titulo: 'Hemograma e bioquímica', aberto: true, mostrarRef: true, parametros: [
              { nome: 'Hemoglobina', valor: '12,1', unidade: 'g/dL', ref: '13,5 – 17,5' },
              { nome: 'Creatinina', valor: '1,6', unidade: 'mg/dL', ref: '0,7 – 1,3' },
              { nome: 'Sódio', valor: '133', unidade: 'mEq/L', ref: '135 – 145' },
              { nome: 'Potássio', valor: '4,8', unidade: 'mEq/L', ref: '3,5 – 5,0' }] },
            { titulo: 'Marcadores cardíacos', aberto: false, mostrarRef: true, parametros: [
              { nome: 'NT-proBNP', valor: '4.850', unidade: 'pg/mL', ref: '< 450' },
              { nome: 'Troponina I', valor: '0,02', unidade: 'ng/mL', ref: '< 0,04' }] }
          ],
          pergunta: '<p><b>Desafio:</b> qual a principal hipótese diagnóstica e qual seria sua conduta inicial? Justifique com os achados do caso.</p>',
          resolucao: '<p>Insuficiência cardíaca descompensada, perfil B (quente e úmido) — provável ICFEr hipertensiva. Conduta: diurético de alça EV, vasodilatador se PA elevada, oxigênio, ecocardiograma e otimização da terapia.</p>',
          resolucaoVisivel: false
        },
        enquete: { pergunta: 'Perfil hemodinâmico mais provável:', opcoes: ['Quente e seco (A)', 'Quente e úmido (B)', 'Frio e úmido (C)', 'Frio e seco (L)'], multipla: false, anonima: true, encerrada: false } }
    },
    'forum/f1/votos': { u9: { opcoes: [1], em: agora - dia }, u2: { opcoes: [1], em: agora - dia }, u10: { opcoes: [0], em: agora - dia } },
    'forum/f1/comentarios': { c1: { autor: 'u9', html: '19h é perfeito para quem sai do internato!', criadoEm: agora - 4 * dia, curtidas: ['u2'], pai: null } },
    'forum/f2/comentarios': { c1: { autor: 'u10', html: 'Penso em IC descompensada pela ortopneia, DPN, B3 e NT-proBNP elevado.', criadoEm: agora - 20 * min, curtidas: [], pai: null } },
    financeiro: {
      fi1: { tipo: 'Entrada', descricao: 'Mensalidades de setembro', valor: 450, data: somarDias(h, -40), criadoEm: agora - 40 * dia },
      fi2: { tipo: 'Saída', descricao: 'Material para ação de extensão', valor: 120, data: somarDias(h, -33), criadoEm: agora - 33 * dia }
    },
    atas: { at1: { titulo: 'Reunião Geral da Diretoria', data: somarDias(h, -20), resumoHtml: '<p>Planejamento do semestre e definição de novas oportunidades.</p>', link: '', criadoEm: agora - 20 * dia } },
    certificados: {
      ce1: { userId: 'u9', nomeMembro: 'Pedro Henrique Nogueira', tipo: 'Aula', titulo: 'Participação em Aula — Distúrbios Hidroeletrolíticos', cargoTexto: 'Distúrbios Hidroeletrolíticos', cargaHoraria: 2, status: 'pendente_presidencia', signerUid: 'u11', signerNome: 'Dra. Andrea Leal Novaes', signerCargo: 'Orientadora — LACMES', criadoPor: 'u4', criadoEm: agora - 6 * dia, historico: [{ em: agora - 6 * dia, por: 'u4', acao: 'Criado' }], codigo: 'LAC-7Q2M-K9XD' }
    },
    'usuarios/u9/notificacoes': {
      n1: { tipo: 'estagio', titulo: 'Amanhã: Estágio de Observação — Ambulatório de Cardiologia', corpo: '08:00 · Hospital Regional do Baixo Amazonas', url: '#/agenda', lida: false, criadoEm: agora - 30 * min }
    }
  };
  // ajusta a estrutura das senhas para o formato esperado pelo motor demo
  dados._demo_senhas = { mapa: senhas };
  Data._resetar(dados);
}
