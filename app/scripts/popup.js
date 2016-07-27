'use strict';



chrome.storage.local.get('cursos', function (items) {
	if (items.cursos) {
		$( 'p' ).replaceWith( 'CR:' + items.cursos[0].cr);
	}
})

