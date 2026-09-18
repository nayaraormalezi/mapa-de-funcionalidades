#!/usr/bin/env python3
"""Fase 15 — transform demo-data journeys + consolidate features."""
from pathlib import Path
import re

path = Path("/Users/nayaraormalezi/mapa-de-funcionalidades/src/database/seed/demo-data.ts")
text = path.read_text()

journeys_new = '''  journeys: [
    {
      id: "jrn-consorcio",
      name: "Jornada do Consórcio",
      description:
        "Jornada compartilhada do consórcio CAIXA — da descoberta ao encerramento. As etapas são JourneyStages; públicos compartilham a mesma estrutura.",
      order: 1,
      momentIds: ["mom-sale", "mom-after-sale"],
      productIds: [],
      active: true,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    /** @deprecated Fase 15 — etapas antigas modeladas como Journey. Mantidas inativas para rastreio. */
    {
      id: "jrn-descoberta",
      name: "Descoberta (legado)",
      description: "DEPRECATED — agora js-jrn-descoberta em jrn-consorcio",
      order: 91,
      momentIds: ["mom-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-consideracao",
      name: "Consideração (legado)",
      description: "DEPRECATED",
      order: 92,
      momentIds: ["mom-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-contratacao",
      name: "Contratação (legado)",
      description: "DEPRECATED",
      order: 93,
      momentIds: ["mom-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-onboarding",
      name: "Onboarding (legado)",
      description: "DEPRECATED",
      order: 94,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-acompanhamento",
      name: "Acompanhamento (legado)",
      description: "DEPRECATED",
      order: 95,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-lance",
      name: "Lance (legado)",
      description: "DEPRECATED",
      order: 96,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-contemplacao",
      name: "Contemplação (legado)",
      description: "DEPRECATED",
      order: 97,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-uso-credito",
      name: "Uso do crédito (legado)",
      description: "DEPRECATED",
      order: 98,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-pos-uso",
      name: "Pós-uso (legado)",
      description: "DEPRECATED",
      order: 99,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-encerramento",
      name: "Encerramento (legado)",
      description: "DEPRECATED",
      order: 100,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "jrn-financeiro",
      name: "Financeiro",
      description: "Pagar parcelas, emitir boletos e consultar extrato.",
      order: 101,
      momentIds: ["mom-after-sale"],
      productIds: [],
      active: false,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
  ],
'''

text, n = re.subn(
    r"  journeys: \[.*?\n  \],\n\n  journeyStages:",
    journeys_new + "\n  journeyStages:",
    text,
    count=1,
    flags=re.S,
)
print("journeys replaced", n)

stage_orders = {
    "js-jrn-descoberta": 1,
    "js-jrn-consideracao": 2,
    "js-jrn-contratacao": 3,
    "js-jrn-onboarding": 4,
    "js-jrn-acompanhamento": 5,
    "js-jrn-lance": 6,
    "js-jrn-contemplacao": 7,
    "js-jrn-uso-credito": 8,
    "js-jrn-pos-uso": 9,
    "js-jrn-encerramento": 10,
}

def fix_stage(m):
    block = m.group(0)
    sid_m = re.search(r'id: "(js-jrn-[^"]+)"', block)
    if not sid_m:
        return block
    sid = sid_m.group(1)
    if sid == "js-jrn-financeiro":
        return block
    order = stage_orders.get(sid)
    if order is None:
        return block
    block = re.sub(r'journeyId: "jrn-[^"]+"', 'journeyId: "jrn-consorcio"', block)
    block = re.sub(r"order: \d+", f"order: {order}", block)
    return block

text, n2 = re.subn(
    r"\{\n      id: \"js-jrn-[^\"]+\",\n      journeyId: \"[^\"]+\",\n      name: \"[^\"]+\",\n      description: \"[^\"]+\",\n      order: \d+,",
    fix_stage,
    text,
)
print("stages patched", n2)

old_jrns = (
    "jrn-descoberta|jrn-consideracao|jrn-contratacao|jrn-onboarding|"
    "jrn-acompanhamento|jrn-lance|jrn-contemplacao|jrn-uso-credito|"
    "jrn-pos-uso|jrn-encerramento|jrn-financeiro"
)

text, n3 = re.subn(
    rf'(id: "need-[^"]+",\n      journeyId: )"(?:{old_jrns})"',
    r'\1"jrn-consorcio"',
    text,
)
print("needs journeyId", n3)

text = text.replace(
    '''id: "need-documentos",
      journeyId: "jrn-consorcio",
      journeyStageId: "js-jrn-acompanhamento",''',
    '''id: "need-documentos",
      journeyId: "jrn-consorcio",
      journeyStageId: "js-jrn-uso-credito",''',
)

text = text.replace(
    '''id: "need-simular",
      journeyId: "jrn-consorcio",
      journeyStageId: "js-jrn-contratacao",
      productId: "imobiliario",
      productIds: ["imobiliario"],
      audienceIds: [],
      name: "Contratar",
      description: "Realizar simulação e concluir a contratação.",''',
    '''id: "need-simular",
      journeyId: "jrn-consorcio",
      journeyStageId: "js-jrn-contratacao",
      productId: "imobiliario",
      productIds: [],
      audienceIds: [],
      name: "Quero simular o consórcio",
      description: "Simular valores, prazos e parcelas antes de contratar.",''',
)

for need_id in [
    "need-acompanhar-cota",
    "need-pagar",
    "need-assembleias",
    "need-historico-financeiro",
    "need-atualizar-dados",
]:
    text, _ = re.subn(
        rf'(id: "{need_id}",\n      journeyId: "jrn-consorcio",\n      journeyStageId: "[^"]+",\n      productId: "[^"]+",\n      )productIds: \["veiculos_leves"\]',
        r'\1productIds: []',
        text,
    )

text = text.replace(
    'name: "Aumentar minhas chances de contemplação"',
    'name: "Quero ofertar um lance"',
)
text = text.replace(
    'name: "Saber quais tipos de lance posso ofertar"',
    'name: "Quero saber quanto posso ofertar"',
)
text = text.replace(
    'name: "Usar meu FGTS para ofertar lance"',
    'name: "Quero utilizar meu FGTS para ofertar um lance"',
)

if "need-entender-lance" not in text:
    insert = '''    {
      id: "need-entender-lance",
      journeyId: "jrn-consorcio",
      journeyStageId: "js-jrn-lance",
      productId: "imobiliario",
      productIds: [],
      audienceIds: [],
      name: "Quero entender como funciona o lance",
      description: "Compreender regras, tipos e impactos do lance na contemplação.",
      measurement: "",
      priority: "HIGH",
      active: true,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
    {
      id: "need-acompanhar-lance",
      journeyId: "jrn-consorcio",
      journeyStageId: "js-jrn-lance",
      productId: "imobiliario",
      productIds: [],
      audienceIds: [],
      name: "Quero acompanhar meu lance",
      description: "Acompanhar status e resultado do lance ofertado.",
      measurement: "",
      priority: "HIGH",
      active: true,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
'''
    text = text.replace(
        'id: "need-lance",',
        insert + '    {\n      id: "need-lance",',
        1,
    )
    print("added lance needs")

if "need-aumentar-chances" not in text:
    insert2 = '''    {
      id: "need-aumentar-chances",
      journeyId: "jrn-consorcio",
      journeyStageId: "js-jrn-lance",
      productId: "imobiliario",
      productIds: [],
      audienceIds: [],
      name: "Quero aumentar minhas chances de contemplação",
      description: "Estratégias e ofertas para melhorar probabilidade de contemplação.",
      measurement: "",
      priority: "MEDIUM",
      active: true,
      createdAt: EARLIER,
      updatedAt: NOW,
    },
'''
    text = text.replace(
        'id: "need-tipos-lance",',
        insert2 + '    {\n      id: "need-tipos-lance",',
        1,
    )

jas_map = [
  ("jas-cli-descoberta", "aud-client", "js-jrn-descoberta", "Descoberta", 1, "mom-sale"),
  ("jas-cli-consideracao", "aud-client", "js-jrn-consideracao", "Consideração", 2, "mom-sale"),
  ("jas-cli-contratacao", "aud-client", "js-jrn-contratacao", "Contratação", 3, "mom-sale"),
  ("jas-cli-onboarding", "aud-client", "js-jrn-onboarding", "Onboarding", 4, "mom-after-sale"),
  ("jas-cli-acompanhamento", "aud-client", "js-jrn-acompanhamento", "Acompanhamento", 5, "mom-after-sale"),
  ("jas-cli-lance", "aud-client", "js-jrn-lance", "Lance", 6, "mom-after-sale"),
  ("jas-cli-contemplacao", "aud-client", "js-jrn-contemplacao", "Contemplação", 7, "mom-after-sale"),
  ("jas-cli-uso-credito", "aud-client", "js-jrn-uso-credito", "Uso do crédito", 8, "mom-after-sale"),
  ("jas-cli-pos-uso", "aud-client", "js-jrn-pos-uso", "Pós-uso", 9, "mom-after-sale"),
  ("jas-cli-encerramento", "aud-client", "js-jrn-encerramento", "Encerramento", 10, "mom-after-sale"),
  ("jas-eco-descoberta", "aud-eco", "js-jrn-descoberta", "Descoberta", 1, "mom-sale"),
  ("jas-eco-consideracao", "aud-eco", "js-jrn-consideracao", "Consideração", 2, "mom-sale"),
  ("jas-eco-contratacao", "aud-eco", "js-jrn-contratacao", "Venda", 3, "mom-sale"),
  ("jas-eco-onboarding", "aud-eco", "js-jrn-onboarding", "Onboarding", 4, "mom-after-sale"),
  ("jas-eco-acompanhamento", "aud-eco", "js-jrn-acompanhamento", "Acompanhamento", 5, "mom-after-sale"),
  ("jas-eco-lance", "aud-eco", "js-jrn-lance", "Lance", 6, "mom-after-sale"),
  ("jas-eco-contemplacao", "aud-eco", "js-jrn-contemplacao", "Contemplação", 7, "mom-after-sale"),
  ("jas-eco-uso-credito", "aud-eco", "js-jrn-uso-credito", "Uso do crédito", 8, "mom-after-sale"),
  ("jas-eco-pos-uso", "aud-eco", "js-jrn-pos-uso", "Pós-uso", 9, "mom-after-sale"),
  ("jas-eco-encerramento", "aud-eco", "js-jrn-encerramento", "Encerramento", 10, "mom-after-sale"),
  ("jas-par-descoberta", "aud-partner", "js-jrn-descoberta", "Descoberta", 1, "mom-sale"),
  ("jas-par-consideracao", "aud-partner", "js-jrn-consideracao", "Consideração", 2, "mom-sale"),
  ("jas-par-contratacao", "aud-partner", "js-jrn-contratacao", "Venda", 3, "mom-sale"),
  ("jas-par-onboarding", "aud-partner", "js-jrn-onboarding", "Onboarding", 4, "mom-after-sale"),
  ("jas-par-acompanhamento", "aud-partner", "js-jrn-acompanhamento", "Acompanhamento", 5, "mom-after-sale"),
  ("jas-par-lance", "aud-partner", "js-jrn-lance", "Lance", 6, "mom-after-sale"),
  ("jas-par-contemplacao", "aud-partner", "js-jrn-contemplacao", "Contemplação", 7, "mom-after-sale"),
  ("jas-par-uso-credito", "aud-partner", "js-jrn-uso-credito", "Uso do crédito", 8, "mom-after-sale"),
  ("jas-par-pos-uso", "aud-partner", "js-jrn-pos-uso", "Pós-uso", 9, "mom-after-sale"),
  ("jas-par-encerramento", "aud-partner", "js-jrn-encerramento", "Encerramento", 10, "mom-after-sale"),
]

jas_lines = ["  journeyAudienceStages: ["]
for jid, aud, stage, name, order, moment in jas_map:
    jas_lines.append(
        f'''    {{
      id: "{jid}",
      audienceId: "{aud}",
      journeyId: "jrn-consorcio",
      journeyStageId: "{stage}",
      displayName: "{name}",
      sortOrder: {order},
      momentId: "{moment}",
      active: true,
      createdAt: EARLIER,
      updatedAt: NOW,
    }},'''
    )
jas_lines.append("  ],")
jas_block = "\n".join(jas_lines)

text, n4 = re.subn(
    r"  journeyAudienceStages: \[.*?\n  \],\n\n  userNeeds:",
    jas_block + "\n\n  userNeeds:",
    text,
    count=1,
    flags=re.S,
)
print("JAS replaced", n4)

text = re.sub(
    r'\{ featureId: "(feat-[^"]+)", journeyId: "jrn-[^"]+" \}',
    r'{ featureId: "\1", journeyId: "jrn-consorcio" }',
    text,
)
text = re.sub(
    r'journeyIds: \["jrn-[^"]+"\]',
    'journeyIds: ["jrn-consorcio"]',
    text,
)

# gaps and any remaining need-style journeyId still on old ids
text, n5 = re.subn(
    rf'(journeyId: )"(?:{old_jrns})"',
    r'\1"jrn-consorcio"',
    text,
)
print("remaining journeyId remaps", n5)

for feat_id in [
    "feat-simular-auto",
    "feat-simular-pesados",
    "feat-consultar-cota-imob",
    "feat-emitir-boleto-imob",
]:
    pattern = (
        r",\n    \{\n      id: \""
        + feat_id
        + r"\",.*?\n      updatedAt: NOW,\n    \}"
    )
    text, nf = re.subn(pattern, "", text, count=1, flags=re.S)
    print(f"remove feature {feat_id}", nf)
    text = re.sub(
        r"\n    \{ featureId: \"" + feat_id + r"\", userNeedId: \"[^\"]+\" \},?",
        "",
        text,
    )
    text = re.sub(
        r"\n    \{ featureId: \"" + feat_id + r"\", journeyId: \"[^\"]+\" \},?",
        "",
        text,
    )

text = text.replace(
    '{ featureId: "feat-segunda-via-extrato", userNeedId: "need-pagar" }',
    '{ featureId: "feat-segunda-via-extrato", userNeedId: "need-historico-financeiro" }',
)
text, _ = re.subn(
    r'(id: "feat-segunda-via-extrato",.*?needIds: )\["need-pagar"\]',
    r'\1["need-historico-financeiro"]',
    text,
    count=1,
    flags=re.S,
)
text, _ = re.subn(
    r'(id: "feat-emitir-boleto",.*?productIds: )\["imobiliario", "veiculos_leves"\]',
    r'\1["imobiliario", "veiculos_leves", "veiculos_pesados"]',
    text,
    count=1,
    flags=re.S,
)
text, _ = re.subn(
    r'(id: "feat-consultar-cota",.*?productIds: )\["imobiliario", "veiculos_leves"\]',
    r'\1["imobiliario", "veiculos_leves", "veiculos_pesados"]',
    text,
    count=1,
    flags=re.S,
)

path.write_text(text)
print("DONE")
