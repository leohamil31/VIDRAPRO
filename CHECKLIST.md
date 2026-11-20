# ✅ VidraPro — Checklist completo (de cabo a rabo)

Status de cada pedido, de cada modelo de produção e de cada etapa do fluxo, do cadastro até a obra concluída.
Legenda: ✅ feito e testado · ⚠️ feito, mas precisa da sua validação · ⏳ próximo passo sugerido.

---

## 1. O que você pediu nos 3 prints

| # | Pedido | Status | Onde ver |
|---|---|---|---|
| 1 | Tirar o **número do pedido** do documento enviado ao cliente e deixar só no painel da empresa | ✅ | PDF, link público e mensagem do WhatsApp **sem número**. O número aparece só no cabeçalho interno (que não sai na impressão), no kanban e na lista de corte da oficina. |
| 2 | Lista de corte com **acessórios**: roldanas, fechos, fechaduras, puxadores etc. | ✅ | Cada modelo gera a sua lista de ferragens (45 itens no catálogo), com quantidade por unidade e total do pedido. Vedações (escova, EPDM) saem em **metros**. Todos têm preço próprio em Configurações › Preços. |
| 3a | **Linhas de esquadria**: as 5 principais do mercado | ✅ | Suprema (25 mm), Gold (32 mm), Linha 30, Inova e Linha 16 (econômica). |
| 3b | Poder **adicionar linhas** (ex.: Sublime) | ✅ | Configurações › Linhas › *Nova linha*: copia uma linha e edita códigos, nome do perfil, kg/m e todos os descontos. A linha aparece no orçamento na hora. |
| 3c | **Seção de temperados separada** das esquadrias | ✅ | No orçamento: alternância *Esquadrias de alumínio* / *Vidro temperado (Blindex)*, cada uma com os seus grupos de modelos. |
| 3d | Guarda-corpos, sacadas, fachada, portas de alumínio, venezianas, lambris e outros | ✅ | 27 modelos no total (tabela abaixo). |

> Não encontrei uma fonte confiável para a linha "Sublime", por isso ela não vem pronta. Ela é criada em 1 minuto copiando a Suprema ou a Gold e ajustando pelo catálogo do seu fornecedor. Esse caso está coberto pelos testes automáticos.

---

## 2. Linhas

| Linha | Família | Perfis | Grupos de desconto | Editável |
|---|---|---|---|---|
| Linha Suprema (25 mm) | Esquadria | 25 | correr, correr porta, abrir/maxim-ar/basculante/fixo, porta de giro, lambri, veneziana | copiar e editar |
| Linha Gold (32 mm) | Esquadria | 25 | idem | copiar e editar |
| Linha 30 | Esquadria | 25 | idem | copiar e editar |
| Linha Inova | Esquadria | 25 | idem | copiar e editar |
| Linha 16 (econômica) | Esquadria | 25 | idem (avisa quando usada em portas) | copiar e editar |
| Fachada Pele de Vidro (Stick) | Fachada | 4 | módulo, coluna, travessa, encaixe | copiar e editar |
| Guarda-corpo de alumínio | Guarda-corpo | 4 | vão entre colunas, corrimão, base, encaixe | copiar e editar |
| Linhas próprias (ex.: Sublime) | qualquer uma das acima | — | — | ✅ total |

⚠️ **Códigos, pesos (kg/m) e descontos são valores de referência**, não copiados de um catálogo de fabricante. Antes de produzir, crie a sua cópia de cada linha e confira com o catálogo da extrusora.

---

## 3. Modelos de produção (27)

Cada modelo foi testado automaticamente em **todas as linhas compatíveis × todos os vidros permitidos × 5 medidas** (mínima, padrão, máxima e combinações): 3.075 combinações. Para cada uma o teste confere:
cortes positivos · vidro menor que o vão · acessórios presentes · desenho dentro do vão · nenhum preço faltando · preço maior que o custo.

### Esquadrias de alumínio

| # | Modelo | Linhas | Perfis cortados | Vidro | Acessórios e ferragens (itemizados) | Desenho | Testado |
|---|---|---|---|---|---|---|---|
| 1 | **Janela de Correr 2 Folhas** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 9 tipos | Vidro da folha | Roldana para janela de correr · Puxador concha · Fecho concha / trinco lateral · Escova de vedação · Guarnição EPDM para vidro · Batente / stop de folha · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 2 | **Janela de Correr 4 Folhas** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 9 tipos | Vidro da folha | Roldana para janela de correr · Puxador concha · Fecho central · Fecho concha / trinco lateral · Escova de vedação · Guarnição EPDM para vidro · Batente / stop de folha · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 3 | **Janela Veneziana de Correr 3 Folhas** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 10 tipos | Vidro da folha de vidro | Roldana para janela de correr · Puxador concha · Fecho concha / trinco lateral · Escova de vedação · Guarnição EPDM para vidro · Batente / stop de folha · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 4 | **Janela Maxim-ar** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 4 tipos | Vidro da folha | Cantoneira de esquadro · Braço articulado maxim-ar · Fecho / cremona para maxim-ar · Guarnição EPDM para vidro · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 5 | **Janela Basculante** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 4 tipos | Vidro da basculante (3 folhas) | Cantoneira de esquadro · Pivô / articulação para basculante · Haste de comando para basculante · Guarnição EPDM para vidro · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 6 | **Janela de Abrir 2 Folhas** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 4 tipos | Vidro da folha | Cantoneira de esquadro · Dobradiça de alumínio · Fecho central · Fecho unha / ferrolho · Guarnição EPDM para vidro · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 7 | **Fixo / Vitrô Fixo** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 3 tipos | Vidro fixo | Cantoneira de esquadro · Guarnição EPDM para vidro · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 8 | **Porta de Correr 2 Folhas** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 9 tipos | Vidro da folha | Roldana dupla com rolamento · Fechadura para porta de correr · Cilindro com chaves · Puxador concha · Escova de vedação · Guarnição EPDM para vidro · Batente / stop de folha · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 9 | **Porta de Correr 4 Folhas** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 9 tipos | Vidro da folha | Roldana dupla com rolamento · Fechadura para porta de correr · Cilindro com chaves · Puxador concha · Fecho concha / trinco lateral · Escova de vedação · Guarnição EPDM para vidro · Batente / stop de folha · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 10 | **Porta Veneziana de Correr 3 Folhas** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 10 tipos | Vidro da folha de vidro | Roldana dupla com rolamento · Fechadura para porta de correr · Cilindro com chaves · Puxador concha · Fecho concha / trinco lateral · Escova de vedação · Guarnição EPDM para vidro · Batente / stop de folha · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 11 | **Porta de Giro com Vidro** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 7 tipos | Vidro superior, Vidro inferior | Guarnição EPDM para vidro · Dobradiça de alumínio · Fechadura para porta de giro · Conjunto de maçanetas com espelho · Cilindro com chaves · Escova de vedação · Espuma expansiva PU · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 12 | **Porta de Giro 2 Folhas com Vidro** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 7 tipos | Vidro superior, Vidro inferior | Guarnição EPDM para vidro · Dobradiça de alumínio · Fechadura para porta de giro · Conjunto de maçanetas com espelho · Cilindro com chaves · Fecho unha / ferrolho · Escova de vedação · Espuma expansiva PU · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 13 | **Porta de Giro Lambri** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 8 tipos | sem vidro | Dobradiça de alumínio · Fechadura para porta de giro · Conjunto de maçanetas com espelho · Cilindro com chaves · Escova de vedação · Espuma expansiva PU · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 14 | **Porta de Giro Veneziana** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 8 tipos | sem vidro | Dobradiça de alumínio · Fechadura para porta de giro · Conjunto de maçanetas com espelho · Cilindro com chaves · Escova de vedação · Espuma expansiva PU · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 15 | **Painel / Fechamento em Lambri** | Linha Suprema, Linha Gold, Linha 30, Linha Inova, Linha 16 + linhas próprias | 3 tipos | sem vidro | Cantoneira de esquadro · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 16 | **Fachada Pele de Vidro** | Fachada Pele de Vidro + linhas próprias | 6 tipos | Vidro do módulo (4 × 2) | Ancoragem / suporte de coluna · Guarnição EPDM para vidro · Silicone estrutural · Kit parafusos e buchas de instalação | ✅ | ✅ |
| 17 | **Guarda-corpo de Alumínio com Vidro** | Guarda-corpo de alumínio + linhas próprias | 4 tipos | Painel de vidro | Chapa de fixação de coluna · Tampa / terminal de corrimão · Guarnição EPDM para vidro · Kit parafusos e buchas de instalação | ✅ | ✅ |

### Vidro temperado (Blindex)

| # | Modelo | Linhas | Perfis cortados | Vidro | Acessórios e ferragens (itemizados) | Desenho | Testado |
|---|---|---|---|---|---|---|---|
| 1 | **Box Frontal** | Sistema temperado | 4 tipos | Painel fixo, Painel móvel | Roldana para box · Puxador para box · Batedor / stop para box · Fixador / prendedor de vidro fixo · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 2 | **Box de Canto (L)** | Sistema temperado | 3 tipos | Fixo frontal, Móvel frontal, Fixo lateral, Móvel lateral | Roldana para box · Puxador para box · Suporte de canto para box · Batedor / stop para box · Fixador / prendedor de vidro fixo · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 3 | **Porta Pivotante** | Sistema temperado | 1 tipos | Folha pivotante | Pivô superior · Pivô inferior · Fechadura de vidro com contra-fechadura · Puxador tubular para temperado 60 cm · Kit parafusos e buchas de instalação | ✅ | ✅ |
| 4 | **Porta de Abrir (Dobradiça)** | Sistema temperado | 1 tipos | Folha de abrir | Dobradiça para vidro temperado · Fechadura de vidro com contra-fechadura · Puxador tubular para temperado 60 cm · Kit parafusos e buchas de instalação | ✅ | ✅ |
| 5 | **Porta de Correr (Roldana Aparente)** | Sistema temperado | 3 tipos | Painel fixo, Folha de correr | Roldana aparente para porta de correr · Guia inferior de piso · Fechadura de vidro com contra-fechadura · Puxador tubular para temperado 60 cm · Fixador / prendedor de vidro fixo · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 6 | **Janela de Correr Temperada 2 Folhas** | Sistema temperado | 3 tipos | Folhas fixas, Folhas de correr | Roldana para janela temperada · Trinco / fecho para janela temperada · Fixador / prendedor de vidro fixo · Escova de vedação · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 7 | **Janela de Correr Temperada 4 Folhas** | Sistema temperado | 3 tipos | Folhas fixas, Folhas de correr | Roldana para janela temperada · Trinco / fecho para janela temperada · Fixador / prendedor de vidro fixo · Escova de vedação · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 8 | **Fixo / Vitrine Temperada** | Sistema temperado | 3 tipos | Vidro fixo | Calço / cunha de fixação no perfil U · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 9 | **Envidraçamento de Sacada (Retrátil)** | Sistema temperado | 4 tipos | Painel de sacada (5 folhas) | Carrinho / roldana para sacada · Pivô giratório de sacada · Fecho / trava de folha de sacada · Escova de vedação · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |
| 10 | **Guarda-corpo Temperado (Perfil U)** | Sistema temperado | 2 tipos | Painel do guarda-corpo (3) | Calço / cunha de fixação no perfil U · Tampa / terminal de corrimão · Kit parafusos e buchas de instalação · Silicone neutro | ✅ | ✅ |


**Vidros disponíveis (14):** comum incolor, fumê, mini boreal e canelado 4 mm; temperado incolor 6/8/10, fumê, verde e bronze 8; laminado 4+4; laminado temperado 5+5 e 6+6; laminado refletivo prata.
**Acabamentos (6):** Branco, Preto, Natural Fosco, Bronze, Champanhe e Amadeirado.

### Alertas técnicos automáticos
- ✅ Peso do vidro por folha acima do limite da linha → sugere linha mais robusta
- ✅ Porta com vidro comum → NBR 7199 (vidro de segurança)
- ✅ Guarda-corpo sem laminado ou abaixo de 1,10 m → NBR 14718
- ✅ Fachada → exige projeto estrutural e ART (NBR 10821 / 6123); colunas acima de 6 m pedem emenda
- ✅ Sacada → NBR 16259 e autorização do condomínio
- ✅ Temperado → furos e recortes **antes da têmpera**, medida final de fábrica
- ✅ Pivotante/abrir pesado → pivô reforçado ou 3 dobradiças
- ✅ Linha leve em porta, folhas de basculante muito baixas, painel de box largo demais

---

## 4. Fluxo completo do sistema

| Etapa | O que acontece | Status |
|---|---|---|
| 1. Cadastro | Cria a empresa, o usuário dono e **todos os preços padrão** (alumínio por acabamento, 14 vidros, 45 acessórios) | ✅ |
| 2. Configurações › Empresa | Logo, nome, CNPJ, WhatsApp, endereço, rodapé, margem, perda de alumínio, arredondamento do vidro, mão de obra, instalação, validade | ✅ |
| 3. Configurações › Preços | Busca por item; acessórios agrupados (Esquadrias, Temperado, Fachada e guarda-corpo, Instalação); preço por unidade, metro, kg ou m² | ✅ |
| 4. Configurações › Linhas | 7 linhas padrão (somente leitura) + linhas próprias editáveis | ✅ |
| 5. Novo orçamento | Esquadria/Temperado → grupo → modelo → linha → medidas (box de canto pede a lateral) → acabamento → vidro → quantidade → ambiente | ✅ |
| 6. Prévia ao vivo | Desenho técnico em escala, preço, custo/lucro, alertas, lista de corte + acessórios | ✅ |
| 7. Salvar | O servidor **recalcula** com os preços do banco e congela uma cópia (orçamentos antigos não mudam) | ✅ |
| 8. Documento do cliente | A4 com logo, desenho de cada item, totais, rodapé e assinatura, **sem número interno** | ✅ |
| 9. PDF | Imprimir › Salvar como PDF (CSS de impressão A4) | ✅ |
| 10. WhatsApp | Mensagem pronta com itens e total, **sem número**, e link público; marca como *Enviado* | ✅ |
| 11. Link público | O cliente vê o orçamento e aprova pelo WhatsApp; rascunhos não ficam públicos | ✅ |
| 12. Kanban | Rascunho → Enviado → Aprovado → Em Produção → Concluído (arrastar ou menu no celular) | ✅ |
| 13. Lista de corte (oficina) | Desenho, perfis com fórmula, vidros (pedido de têmpera), **acessórios e ferragens** por item, totais × quantidade | ✅ |
| 14. Plano de barras 6 m | Otimização por perfil e por cor, com sobra e aproveitamento | ✅ |
| 15. Painel | Orçamentos no mês, em negociação, aprovado, conversão, em produção | ✅ |

---

## 5. Segurança e multiempresa

| Item | Status |
|---|---|
| Isolamento por empresa no banco (RLS forçado em todas as tabelas, incluindo linhas próprias) | ✅ testado no Postgres 16 |
| Empresa não consegue alterar a própria assinatura | ✅ testado |
| Link público não mostra custo, margem, lista de corte nem número interno | ✅ testado |
| Oficina (perfil *workshop*) não vê custo nem composição de preço | ✅ |
| Assinatura vencida → somente leitura | ✅ |
| Webhook de cobrança com assinatura HMAC e idempotência | ✅ |

---

## 6. Testes

| Suíte | Resultado |
|---|---|
| Motor de cálculo (`npm test`) | ✅ 23 testes, 3.075 combinações de modelo × linha × vidro × medida |
| Banco (schema aplicado + RLS + função pública) | ✅ |
| Fluxo no navegador (criar linha Sublime → orçar → salvar → documento sem número → link de rascunho privado) | ✅ |
| Desenho dos 27 modelos | ✅ conferido visualmente |
| API Express rodando contra o banco | ⏳ o código empacota sem erros, mas não foi executado aqui (sem `express`/`pg` instalados no ambiente). Rode `npm install && npm run dev:api` |

---

## 7. Antes de usar em produção

1. ⚠️ Copie cada linha que você usa e confira **códigos, kg/m e descontos** com o catálogo do fornecedor.
2. ⚠️ Revise os **preços de referência** em Configurações › Preços.
3. ⚠️ Faça um piloto: produza 2 ou 3 peças de cada modelo e compare com a lista de corte.
4. ⏳ Suba a API (`backend/`) com o banco Supabase/Postgres e defina `VITE_API_URL` no frontend (sem ela o site roda em **modo demonstração**, como no GitHub Pages).

## 8. Próximas melhorias sugeridas
- ⏳ Bandeira/fixo superior em portas e janelas
- ⏳ Porta camarão, persiana de enrolar, janela pivotante horizontal
- ⏳ Ferragens com códigos do seu fornecedor (campo "código" no preço)
- ⏳ PDF gerado no servidor e envio por e-mail
