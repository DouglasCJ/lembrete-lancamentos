import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // 1. Conecta no seu banco usando as chaves secretas do Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 2. Pega a data de hoje (Formato: 2026-03-19)
  const hoje = new Date().toISOString().split('T')[0]

  // 3. Busca quem corta hoje e ainda está Pendente
  const { data: cortesHoje, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('data_corte', hoje)
    .eq('status', 'Pendente')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // 4. Lógica de Alerta (O log vai aparecer no painel do Supabase)
  if (cortesHoje && cortesHoje.length > 0) {
    console.log(`🚀 Encontrados ${cortesHoje.length} cortes para hoje!`)
    
    // Por enquanto vamos simular o envio listando no console
    for (const item of cortesHoje) {
      console.log(`AVISO: Convênio ${item.convenio} (Resp: ${item.responsavel}) precisa de lançamento.`);
    }
  } else {
    console.log("✅ Nenhum corte pendente para hoje.");
  }

  return new Response(JSON.stringify({ message: "Processado!", total: cortesHoje?.length || 0 }), {
    headers: { "Content-Type": "application/json" },
  })
})