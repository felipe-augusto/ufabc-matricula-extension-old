window.addEventListener('load', function() {
	var url = document.location.href;

    if(url.indexOf('aluno.ufabc.edu.br/dados_pessoais') != -1) {
        toastr.info("Clique em <a href='https://aluno.ufabc.edu.br/fichas_individuais' style='color: #FFF !important;'>Ficha Individual</a> para atualizar suas informações!");
    }

    if(url.indexOf('aluno.ufabc.edu.br/fichas_individuais') != -1) {
        toastr.info('A mágica começa agora...');
        
        var aluno = getEmailAluno();
		clearAlunoStorage(aluno);

		iterateCursosTable ();
    };
});

function iterateCursosTable () {
	var cursos = $('tbody').children().slice(1);
    cursos.each(function () {
    	var curso = {};

    	var tableRow = $(this).children();

    	curso.curso = tableRow[0].innerText.replace("Novo", '');
		curso.turno = tableRow[3].innerText;

    	var link = $(tableRow[1]).children('a').attr('href');
    	
    	getFichaAluno(link, curso);
    })
}

function getFichaAluno(url, curso) {
    var ficha_url = url.replace('.json', '');
    var aluno = getEmailAluno();

    $.get( 'https://aluno.ufabc.edu.br' + ficha_url, function( data ) {
        var ficha_obj = $($.parseHTML(data));
        var info = ficha_obj.find('.coeficientes tbody tr td');

        curso.cp = toNumber(info[0]);
        curso.cr = toNumber(info[1]);
        curso.ca = toNumber(info[2]);
        curso.quads = ficha_obj.find(".ano_periodo").length;

        $.get( 'https://aluno.ufabc.edu.br' + url, function( data ) {
            curso.cursadas = data;
            

            chrome.storage.local.get(aluno, function (data) {
                data[aluno].push(curso);
                console.log(data);
            	chrome.storage.local.set(data);
             })
            
            toastr.info('Salvando disciplinas do curso do ' + curso.curso + ' para o usuário ' + aluno + '.');
        });
    });   
}

function getEmailAluno() {
	return $('#top li')
		.last()
		.text()
		.replace(/\s*/,'')
		.split('|')[0]
		.replace(' ','');
};

function clearAlunoStorage(aluno) {
	var tmp_obj = {};
    tmp_obj[aluno] = [];
    chrome.storage.local.set(tmp_obj);
}

function toNumber(el) {
	return parseFloat(el.innerText.replace(',', '.'));
}