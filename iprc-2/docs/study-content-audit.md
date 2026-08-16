# Auditoria editorial dos estudos

Auditoria realizada em 16 de agosto de 2026, antes de qualquer alteração de conteúdo no D1 de preview.

| Estudo | Vídeo | Estado editorial encontrado | Legenda oficial no YouTube |
| --- | --- | --- | --- |
| A Fé — Oportunidades Notáveis | `b8anLmQG6l0` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |
| O Ser de Deus — A Soberania de Deus | `dr-d1Ou7oXk` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |
| Retidão e Justiça | `HXvHXFRYRAw` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |
| A Graça de Deus | `5NqLcRsfTFM` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |
| Deus é Paciente | `PCmLMkMWhcE` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |
| Deus é Amor | `UrgARjALi-4` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |
| A Verdade de Deus | `9_PsQUdO7Uc` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |
| O Ser de Deus | `tUglVULg8Vs` | sem resumo, transcrição, conteúdo editorial ou referências | indisponível |

Nos oito vídeos, o player oficial do YouTube informou “Não há legendas/legendas descritivas disponíveis”. Embora o HTML exponha metadados residuais com o nome de uma faixa automática, o endpoint oficial devolve conteúdo vazio; isso não é tratado como transcrição disponível. Nenhum resumo, referência ou texto foi inferido a partir dos vídeos.

## Conteúdo manual recebido

Depois da auditoria, o usuário forneceu a transcrição integral de **A Fé — Oportunidades Notáveis**. O arquivo-fonte foi preservado sem reescrita em `content/studies/a-fe-oportunidades-notaveis.transcript.txt`, identificado como `manual_user_provided` e `raw`. A versão de leitura em `content/studies/a-fe-oportunidades-notaveis.editorial.md` organiza somente ideias presentes na transcrição, separa a oração e não substitui a fonte original.

A migration `0009_first_study_manual_content.sql` grava o conteúdo apenas na entidade administrativa. A revisão pública criada pela migration `0008_study_publications.sql` continua intacta até uma ação editorial explícita de **Republicar**. Os outros sete estudos permanecem com vídeo, metadados e o fallback honesto de transcrição indisponível.

## Fluxo para próximas transcrições

1. Receber texto completo e confirmar sua origem e autorização.
2. Preservar o texto original em arquivo versionado, sem correções silenciosas.
3. Registrar `transcript_source = manual_user_provided` e `transcript_status = raw`.
4. Produzir, quando solicitado, uma versão editorial separada e rastreável.
5. Cadastrar apenas referências claramente sustentadas pelo texto.
6. Salvar no painel como alteração privada e revisar o preview.
7. Republicar explicitamente somente após aprovação editorial.
