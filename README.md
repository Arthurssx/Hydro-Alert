# Pluvial · alerta de deslizamento para Juiz de Fora

Protótipo acadêmico do **Challenge FIAP 2026**. O desafio é encontrar uma solução para conter os problemas causados pelas chuvas e pelos desastres naturais em Juiz de Fora.

> **Tudo aqui é demonstração.** As encostas, os moradores, os abrigos, os sensores e os totens são **fictícios**, e os limites de risco foram inventados para a apresentação. Nenhuma sirene real é acionada e nenhuma mensagem real é enviada. Em emergência, ligue **193** (Bombeiros), **199** (Defesa Civil) ou **192** (SAMU).

---

## Padrão visual (Challenge Sprint 1 · Frontend)

O site segue o documento de design da Sprint 1: tom moderno, limpo, institucional e acolhedor, com superfícies escuras de azul-petróleo e um único amarelo de alerta.

| Token | Cor | Uso |
|---|---|---|
| `--ink` | `#0e2833` | Texto principal, topo e hero |
| `--rain` | `#1d6f94` | Números, barras, bordas de passos, foco de campo |
| `--signal` | `#f5c518` | Botão principal e anel de foco (o único amarelo) |
| `--paper` | `#fbfcfc` | Fundo da página |
| `--sky` | `#e6f0f4` | Etiquetas de nível, trilha das barras, estado vazio |
| `--muted` | `#4a606b` | Texto secundário e legendas |

- **Tipografia:** Bricolage Grotesque 800 nos títulos (h1 68 px, h2 40 px, h3 22 px) e Instrument Sans no texto (corpo 17 px com entrelinha 1,6; destaque 19 px; apoio 15 px; rodapé 14 px).
- **Cantos:** 10 px em botões secundários e campos; 14 a 18 px em cartões e janelas; pílula (999 px) no botão principal, nas etiquetas de nível e nas barras do ranking.
- **Sombras:** cartões `0 10px 30px rgba(14,40,51,.08)`; botão principal ao passar o mouse `0 8px 0 rgba(14,40,51,.4)`; janelas `0 30px 80px rgba(14,40,51,.33)`.
- **Componentes do documento:** botão amarelo "Registrar relato", três contadores (relatos, pontos e nível) e etiquetas de nível (Vizinho, Guardião, Sentinela), na página inicial.
- **Contraste:** todas as páginas foram verificadas com um script de contraste WCAG; texto comum fica acima de 4,5:1 e títulos acima de 3:1.
- **Trocar pontos por benefícios:** na comunidade (`comunidade.html#/beneficios`), os pontos viram cupons de desconto e vivências na cidade (parceiros fictícios). Trocar não reduz o nível.

## O problema

Em Juiz de Fora, a chuva forte causa dois tipos de estrago:

- **Alagamentos**, muitas vezes piorados por bueiros entupidos.
- **Deslizamentos de encosta**, o risco mais grave para quem mora nos morros.

Um deslizamento acontece em segundos. Detectar "na hora" serve para mandar o resgate, mas é tarde para evacuar. O que salva vidas é **avisar antes**, porque a encosta costuma dar sinais:

- chuva acumulada de vários dias;
- movimento lento do solo;
- rachaduras em paredes e no chão, árvores e postes inclinando, água barrenta saindo do barranco.

## A solução: prevenir, alertar e responder

O Pluvial cobre os três momentos do desastre num sistema só:

| Momento | O que o Pluvial faz | Página |
|---|---|---|
| **Antes**: prevenção | Moradores relatam bueiros entupidos; um sensor no bueiro mede o acúmulo; uma fila de manutenção diz onde limpar primeiro. | `index.html`, `painel.html` |
| **Durante**: alerta | A central junta chuva acumulada, sensores de inclinação na encosta e relatos dos moradores, e calcula o nível de risco de cada área. | `central.html` |
| **Na hora**: resposta | Um operador confirma o alerta. A sirene toca, o WhatsApp chega com abrigo e rota, os totens mostram o que fazer, os moradores respondem se estão seguros e os bombeiros vão a quem pediu ajuda. | `central.html`, `totem.html` |
| **Sempre**: comunidade | Moradores avisam riscos, confirmam ou contestam avisos, organizam mutirões e combinam quem ajuda quem. Ações valem pontos, missões semanais e ranking de moradores e bairros. Sinais de deslizamento vão direto para a central. | `entrar.html` | Entrar e criar conta (e-mail, senha, bairro, aceite dos termos), com conta de demonstração. |
| `js/auth.js` | Contas e sessão: senha com hash PBKDF2, manter conectado, sair, excluir conta, bloqueio após 5 tentativas. |
| `comunidade.html` |

### Como o alerta funciona

```
chuva 72h + sensor de inclinação + relatos de rachaduras
                    ↓
     nível por encosta: Observação → Atenção → Alerta → Alerta máximo
                    ↓
     operador da central confirma (o sistema nunca dispara sozinho)
                    ↓
   sirene da comunidade  +  WhatsApp com abrigo e rota  +  totens
                    ↓
   moradores respondem: 1 estou seguro · 2 preciso de ajuda · 3 tem gente presa
                    ↓
   central vê quem está seguro e manda as equipes, com prioridade para presos e feridos
```

**Por que um operador confirma:** alarme falso faz a população parar de acreditar na sirene. O sistema calcula e sugere; a decisão e a responsabilidade ficam com uma pessoa da Defesa Civil.

**Por que três canais:** o WhatsApp alcança quem tem internet, a sirene alcança todo mundo e o totem atende quem está sem celular, sem bateria ou sem sinal.

---

## Como rodar

É um site estático, sem instalação e sem build. Ele precisa ser aberto por um servidor local, e não com dois cliques no arquivo:

```bash
cd pluvial
python3 -m http.server 4330
```

Depois abra **http://127.0.0.1:4330/central.html**. O mapa, a chuva real e as rotas precisam de internet na primeira vez.

## Roteiro de apresentação (cerca de 5 minutos)

1. **Central** (`central.html`): mostre o mapa 3D com o relevo dos morros e a chuva real dos últimos 3 dias.
2. Clique em **"Rodar cenário de temporal"**. A chuva sobe, a encosta Dom Bosco começa a se mover, chegam relatos de rachaduras e ela vai para **Alerta máximo**. A linha do tempo registra cada mudança.
3. Na encosta Dom Bosco, explique **"Por que este nível"** e clique em **"Confirmar e disparar alerta"**.
4. Mostre a sirene, a rota até o abrigo e o **WhatsApp** no celular simulado. Responda **3, tem gente presa**.
5. Mostre as casas mudando de cor, a contagem de **pessoas seguras** e os **pedidos de ajuda**. Com só 3 equipes, envie uma e acompanhe a viatura pelas ruas.
6. Clique em **"Abrir totem"** e deixe as duas janelas lado a lado. O totem mostra **"SAIA AGORA"**, a rota a pé e o abrigo. Toque em **"Ouvir orientações"** e depois em **"Pedir socorro"**: o pedido aparece na central.
7. Abra a **comunidade**, crie um perfil e publique um aviso de "rachadura ou sinal de deslizamento" no Dom Bosco: ele aparece na linha do tempo da central e conta como relato da encosta. Mostre as missões e o ranking de bairros.
8. Para fechar, mostre a página inicial: ela apresenta os três momentos, mostra ao vivo se há alerta na central e tem o ranking da comunidade.

## Páginas e arquivos

| Arquivo | O que é |
|---|---|
| `central.html` | Central de risco: mapa 3D, simulação, disparo do alerta, evacuação e equipes. |
| `totem.html?id=T-02` | Tela do totem de emergência (há totens de `T-01` a `T-05`). |
| `index.html` | Página inicial: apresenta a solução inteira, com relatos de bueiro, sensor, situação ao vivo das encostas e ranking. |
| `comunidade.html` | Rede dos moradores: avisos, mutirões, rede de ajuda, dicas, missões e ranking. |
| `painel.html` | Painel dos bueiros: 40 bueiros em ruas reais, chuva real, previsão de transbordamento, avisos dos moradores, ordem de serviço com rota de limpeza e indicadores. |
| `js/bueiros.js` | Rede de bueiros: nível, chuva, previsão, relatos, rota e resumo para a central e a landing. |
| `js/drenagem-central.js` | Mostra na central o risco de alagamento vindo da rede de bueiros. |
| `js/comunidade-dados.js` | Perfis, publicações fictícias, regras de pontos, missões e ranking (usado pela página inicial e pela comunidade). |
| `js/risco.js` | Encostas, abrigos e totens fictícios e as regras de risco. |
| `js/central.js` | Painel, mapa 3D e simulação da central. |
| `js/resposta.js` | Disparo, sirene, WhatsApp simulado, respostas, pedidos de ajuda e viaturas. |
| `js/totem.js` | Tela do totem, SOS, relatos e leitura em voz. |
| `js/canal.js` | Ligação entre a central e os totens abertos no mesmo navegador. |
| `js/estilo-mapa.js` | Estilo escuro do mapa e cálculo de rotas, usados pela central e pelo totem. |
| `sw.js`, `js/offline.js` | Modo sem internet. |

### Regras de risco (fictícias)

| | Atenção | Alerta | Alerta máximo |
|---|---|---|---|
| Chuva 72h, encosta de suscetibilidade alta | 50 mm | 90 mm | 140 mm |
| Chuva 72h, suscetibilidade média | 70 mm | 120 mm | 180 mm |
| Movimento do solo (sensor de inclinação) | 1 mm/h | 5 mm/h | 15 mm/h |

O nível sobe mais um grau se houver chuva e movimento ao mesmo tempo, ou se chegarem 3 ou mais relatos de rachadura. Na vida real, esses limites vêm de estudos geotécnicos de cada encosta e dos critérios da Defesa Civil e do Cemaden.

## Rede de bueiros (drenagem)

- **40 bueiros fictícios em ruas reais** de 11 bairros, cada um com um sensor de distância na tampa.
- **Nível = entupimento + chuva:** o entupimento (lixo, folhas, terra) cresce um pouco por dia, mais rápido no Centro e no Dom Bosco, e a chuva real das últimas 3 horas (Open-Meteo) soma água. Acima de 85% o bueiro pode transbordar; entre 60% e 85%, pede atenção.
- **Previsão:** a mesma conta com a chuva prevista para 12 horas diz quando o bueiro deve transbordar ("transborda em ~6 h"). Cada bueiro tem um gráfico das últimas 24 h e das próximas 12 h.
- **Simular temporal:** um controle soma chuva (mm por hora) para a apresentação, porque em dia seco a rede fica tranquila.
- **Avisos dos moradores:** relatos da página inicial e avisos de "bueiro entupido" ou "alagamento" da comunidade são ligados ao bueiro mais provável e sobem a prioridade; confirmações de vizinhos pesam mais.
- **Ordem de serviço:** o operador escolhe os bueiros (ou os 6 mais urgentes), o sistema monta a rota de limpeza pelas ruas a partir da base da equipe, com distância e tempo estimado, e a equipe marca cada parada como limpa. Os avisos ligados viram "Resolvido pela equipe de limpeza" na comunidade.
- **Alagamento na central:** bairros com 2 ou mais bueiros críticos aparecem como risco de alagamento na central, com os bueiros no mapa.
- **Indicadores:** bueiros limpos no mês, tempo médio do aviso à limpeza, avisos por bairro e últimas limpezas (o histórico inicial é fictício).

## Comunidade e ranking

- **Tipos de publicação:** aviso de risco (bueiro, alagamento, rachadura ou sinal de deslizamento, árvore ou poste), mutirão (com data e local), rede de ajuda e dica.
- **Como numa rede social:** grupos por bairro (entrar e sair), mutirões como eventos ("vou participar" ou "tenho interesse"), reações (👍 apoio, ⚠️ importante, 🙏 obrigado, 😟 preocupado), comentários com respostas, foto na publicação, salvar, busca, notificações, perfis com selos e destaques no topo (alerta oficial da central, próximo mutirão, missão, bairro destaque e dica do dia).
- **Vizinhos fictícios reagem:** depois que você publica, alguns moradores fictícios reagem, confirmam ou comentam em poucos segundos, e você recebe notificações. Serve para a demonstração parecer viva; na versão real, seriam pessoas.
- **Contra relatos falsos:** vizinhos confirmam ou contestam avisos. Um aviso contestado por mais gente do que confirmou perde os pontos, e qualquer publicação pode ser denunciada.
- **Pontos:** +10 relato de bueiro, +10 participar de mutirão, +15 organizar mutirão (+2 por participante), +5 aviso (+3 por confirmação), +2 comentário, +1 confirmar ou contestar, +1 por "útil" recebido e +15 por missão semanal completa.
- **Níveis:** Vizinho, Guardião (30), Sentinela (80) e Referência do bairro (160).
- **Privacidade:** só apelido e bairro, sem telefone, endereço ou foto de pessoas. Pedido de socorro não é feito pela rede: o aviso manda ligar 193.

## Contas e login

- **Criar conta:** apelido, e-mail, senha (mínimo de 8 caracteres, com letras e números, e medidor de força), bairro, opção de receber alertas e aceite dos termos e da política de privacidade.
- **Entrar:** e-mail e senha, "manter conectado" por 30 dias e bloqueio de 30 segundos depois de 5 tentativas erradas. O erro não diz se foi o e-mail ou a senha.
- **Senha nunca em texto:** guardamos só um hash PBKDF2-SHA-256 com sal aleatório.
- **Sem conta,** a comunidade fica só para leitura; publicar, reagir ou comentar leva para a página de entrar e depois volta.
- **No perfil:** editar apelido e bairro, sair e **excluir a conta** (direito garantido pela LGPD), o que apaga também os dados da comunidade ligados a ela.
- **Conta de demonstração** para apresentações, sem senha e claramente marcada.
- **Limite do protótipo:** as contas ficam só no navegador. Na versão real, o login seria feito por um serviço de autenticação (por exemplo, Supabase Auth), com confirmação e recuperação de senha por e-mail.

## Funcionar sem internet

A crítica mais forte ao projeto anterior foi: *"e quando a internet cair justo na tempestade?"*

- **No protótipo:** o site se instala no navegador (service worker). Na primeira visita com internet, ele guarda as páginas e baixa o mapa e o relevo de Juiz de Fora. Sem conexão, tudo continua abrindo com os dados salvos e aparece o aviso "Sem internet". A central e o totem conversam pelo próprio navegador, sem precisar de internet.
- **Para testar:** abra no **Chrome, Edge ou Firefox** pelo endereço `http://127.0.0.1:4330`. Espere aparecer "Pronto para funcionar sem internet" no rodapé, ative "Offline" nas ferramentas de desenvolvedor (aba Rede) e recarregue. O navegador embutido de alguns editores bloqueia esse recurso.
- **No mundo real:** totens e sirenes não dependeriam da internet do morador. Teriam bateria, painel solar e um link de rádio de longo alcance (LoRa) até a central, além de guardar localmente o último alerta, os abrigos e as rotas.

## Respostas às críticas da banca

**"Isso já existe."** A Defesa Civil já tem SMS, alertas no celular e sirenes em algumas cidades, e o Cemaden monitora a chuva. O Pluvial **não substitui** esses sistemas; ele se integra a eles e acrescenta o que falta:

1. **Sensores de inclinação de baixo custo** em encostas que hoje não são monitoradas.
2. **O relato dos moradores** (rachaduras, estalos, água barrenta) entrando no cálculo de risco.
3. **Conversa nos dois sentidos:** o alerta pergunta "você está seguro?" e a central passa a ver, em tempo real, quem saiu, quem precisa de ajuda e para onde mandar as equipes primeiro.
4. **O totem** para quem está sem celular, sem bateria ou sem sinal.

**"E a escala?"** A unidade do sistema é a **encosta**: alguns sensores, uma sirene e um totem por área de risco. Para crescer, basta acrescentar encostas, começando pelas de risco alto já mapeadas pela prefeitura. A central é uma só para a cidade, e o mesmo software serve a outras cidades com morros (o modelo é igual, mudam os dados).

**"O celular falha no desastre."** Por isso há três canais (sirene, totem e WhatsApp) e os equipamentos de campo funcionam com bateria e rádio, sem depender da internet.

## Custos estimados (a validar com fornecedores)

Valores aproximados para o **kit de uma encosta**, só para dar ordem de grandeza. Não são cotações.

| Item | Faixa estimada |
|---|---|
| Microcontrolador (ESP32) | R$ 40 a 80 |
| Sensor de inclinação/acelerômetro | R$ 20 a 60 por ponto |
| Sensor de umidade do solo | R$ 15 a 40 por ponto |
| Pluviômetro de báscula | R$ 150 a 400 |
| Rádio LoRa | R$ 60 a 150 |
| Painel solar, bateria e caixa à prova d'água | R$ 300 a 700 |
| Sirene de rua com amplificador | a cotar |
| Totem (tela para área externa, gabinete, bateria) | a cotar; é o item mais caro |

O WhatsApp oficial (API do WhatsApp Business) cobra por mensagem e exige que o morador aceite receber os avisos.

## Privacidade (LGPD)

- O cadastro para receber alertas guardaria **telefone e endereço**, dados pessoais. Precisa de **consentimento** claro, uso só para alertas, opção de sair a qualquer momento e acesso restrito à Defesa Civil.
- A resposta "estou seguro" e a localização só servem para o resgate e devem ser apagadas depois do evento.
- O protótipo não coleta nenhum dado real: tudo fica no navegador de quem está usando.

## Limitações do protótipo

- Dados fictícios: encostas, moradores, abrigos, sensores, totens e limites.
- A central e o totem só se falam quando estão abertos **no mesmo navegador**. Na versão real, haveria um servidor.
- As rotas usam o servidor público de testes do OSRM (rotas de carro). Se ele não responder, a rota vira uma linha reta.
- A chuva real é uma estimativa de modelo do Open-Meteo para um ponto da cidade, não a medição de um pluviômetro.

## Próximos passos

1. Servidor com banco geográfico (por exemplo, Supabase com PostGIS) e login da Defesa Civil.
2. Integração com os dados oficiais do Cemaden e da Defesa Civil e com as áreas de risco mapeadas pela prefeitura.
3. Protótipo físico de um sensor de encosta (ESP32 com acelerômetro, umidade e LoRa).
4. Envio real de WhatsApp em ambiente de teste e cadastro de moradores com consentimento.
5. Teste com moradores e agentes da Defesa Civil de uma comunidade.

## Créditos e licenças

- Mapa: [OpenFreeMap](https://openfreemap.org), © [OpenMapTiles](https://openmaptiles.org), dados © [colaboradores do OpenStreetMap](https://www.openstreetmap.org/copyright).
- Relevo: Terrain Tiles (Mapzen), hospedados na AWS.
- Previsão e chuva: [Open-Meteo](https://open-meteo.com) (CC BY 4.0).
- Rotas: [OSRM](https://project-osrm.org), servidor público de demonstração.
- Biblioteca de mapa: [MapLibre GL JS](https://maplibre.org) (licença BSD).
- Fontes Anton e Bricolage Grotesque (SIL Open Font License).
- Foto do Parque do Museu Mariano Procópio: bolapiercing, CC BY 2.0.
