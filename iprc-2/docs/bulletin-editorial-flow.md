# Fluxo editorial dos boletins

## Publicação digital

O boletim digital é a publicação canônica para leitura no site. A área administrativa mantém duas realidades separadas:

- a entidade editorial, atualizada pelo autosave;
- um snapshot público imutável em `bulletin_publications`.

Salvar nunca publica. A primeira ação **Publicar** cria a revisão 1. Alterações posteriores ficam sinalizadas como não publicadas e a versão anterior continua visível até a ação explícita **Republicar**. Cada republicação cria uma nova revisão, preserva número e slug e registra ator, horário e revisão no histórico de auditoria. **Despublicar** retira o snapshot ativo do site sem excluir o boletim nem alterar eventos da Agenda; o mesmo boletim pode ser publicado novamente.

Eventos novos solicitados pelo editor nascem como rascunho. A primeira publicação pode promover os eventos pertencentes ao boletim; editar, republicar ou despublicar não muda implicitamente eventos existentes ou vinculados.

## Rotina semanal

1. Duplicar uma edição anterior ou criar um rascunho.
2. Revisar pastoral, avisos, atividades, aniversários, escala e leituras.
3. Conferir a prévia digital e a prévia de impressão.
4. Salvar e revisar o estado “alterações não publicadas”.
5. Publicar ou republicar deliberadamente.
6. Confirmar a edição em `/boletins` e em sua URL permanente.

Aniversariantes começam como **Somente impressão**. O ano de nascimento não faz parte da entrada editorial. Somente registros marcados **Digital e impressão** entram no snapshot público; itens ocultos não aparecem em nenhuma prévia final.

## Impressão e evolução futura

A prévia atual preserva o formato técnico de seis painéis em duas folhas A4 paisagem. Ela serve para conferência estrutural, mas ainda não substitui com fidelidade o arquivo oficial produzido no Canva. Até a renderização final ser homologada, o Canva continua sendo a origem do boletim impresso.

Continuação planejada, fora da Fase 9:

- medição real de paginação e limites por painel;
- geração determinística de PDF a partir do snapshot aprovado;
- armazenamento do PDF no R2 e vínculo com a revisão publicada;
- templates anuais de capa e contracapa;
- comparação visual automatizada antes da impressão.

Não estão previstos nesta etapa editor livre, drag-and-drop ou reprodução do Canva no navegador.
