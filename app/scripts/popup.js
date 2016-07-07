'use strict';



chrome.storage.local.get("cursos", function (items) {
	if (items.cursos) {
		$( "p" ).append( "CR:" + items.cursos[0].cr);
	} else {
		$( "p" ).append( "Parece que nós nao temos suas informações, <a href='https://aluno.ufabc.edu.br/' target='_blank'>vamos carregá-las?</a>");
	}
})

