'use strict';

var cursos = [];

function getDisciplinas(url, i) {
    // entra na ficha para pegar o cr, ca e cp
    // detalhe importante, cada curso tem um cp associado
    var ficha_url = url.replace(".json", "");
    $.get( "https://aluno.ufabc.edu.br" + ficha_url, function( data ) {
        var ficha_obj = $($.parseHTML(data));
        var string = ficha_obj.find(".coeficientes").prop('outerHTML');
        var coeficientes_regex = /.*(\d,\d{3}).*/g;
        var match = true;
        var count = 0;
        while (match) {
            match = coeficientes_regex.exec(string);
            try {
                string = string.replace(match[0], "").replace(" ", "");
            } catch (err) {
                break;
            }
            
            if (count == 0) {
                cursos[i - 1].cp = match[1];
            } else if (count == 1) {
                cursos[i - 1].cr = match[1];
            };
            count += 1;
        }
        
        
    });

    $.get( "https://aluno.ufabc.edu.br" + url, function( data ) {
        // porque i - 1?
        cursos[i - 1].cursadas = data;
        chrome.storage.local.set({"cursos": cursos});
        toastr.info('Salvando disciplinas do curso de ' + cursos[i - 1].curso + ".");
    });
}

window.addEventListener("load", function() {
	var url = document.location.href;
	// essa url mapeia a pagina principal da matricula da ufabc
    if(url.indexOf('aluno.ufabc.edu.br/fichas_individuais') != -1) {
    	$("tbody").children().each(function (child) {
    		if ($(this).children('th').length == 0) {
    			// nao estamos no header da tabela
    			var linha = $(this).children();
    			// 0 -> curso
    			// 3 -> turno
    			// 6 -> situacao
    			var count = 0;
                var obj = {};
    			linha.each(function (i) {
    				var texto = $(this).text();
    				if (count == 0) {
    					var texto = $(this).children('a').text();
                        obj.curso = texto;
    				} else if (count == 1) {
                        var texto = $(this).children('a').attr("href");
                        getDisciplinas(texto, child);
                    } else if (count == 3) {
    					obj.turno = texto;
    				} else if (count == 6) {
						obj.situacao = texto;
    				};
    				count += 1;
    			});
                cursos.push(obj);
    		};
    	});
    };
    // ficha individual do cidadao
    // setTimeout(function(){
    //     chrome.storage.local.get('cursos', function(items) {
    //         console.log(items);
    //     });
    // }, 5000);
    

});