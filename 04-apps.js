const express = require('express');
const app = express();
const fs = require('fs');
app.use(express.static('public'));
/* on associe le moteur de vue au module «ejs» */
const MongoClient = require('mongodb').MongoClient;
const bodyParser= require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs'); // générateur de template


////////////////////////////////////////// Connexion à mongoDB et au serveur Node.js
let db // variable qui contiendra le lien sur la BD

MongoClient.connect('mongodb://127.0.0.1:27017/carnet_adresse', (err, database) => {
 if (err) return console.log(err)
 db = database.db('carnet_adresse')
// lancement du serveur Express sur le port 8081
 app.listen(8081, () => {
 console.log('connexion à la BD et on écoute sur le port 8081')
 })
})


/*

	Cette page sera accéder lorsque l'utilisateur appuyera sur l'onglet "Adresses" se trouvant dans l'entête de la page.
	Elle se compose de la liste des membres présents dans la base de données
	
*/


app.get('/list', (req, res) => {
 
 let cursor = db.collection('adresse')
                .find()
                .toArray(function(err, resultat){
 if (err) return console.log(err)
 	console.log(JSON.stringify(resultat))
 // transfert du contenu vers la vue index.ejs (renders)
 // affiche le contenu de la BD
 res.render('adresses.ejs', {adresses: resultat})
 }) ;

})

/*

	La page d'accueil est à la racine de la connexion au local host et donnera accès aux différentes pages.
	
*/


app.get('/', (req, res) => {
 //res.end('<h1>Accueil</h1>')
 res.render('accueil.ejs');
})


/*

	Cette fonction permet de trier la liste en fonction de la clé et de l'ordre envoyé dans le routeur. Elle filtrera les données de la base pour l'organiser dans un nouveau
	tableau qui sera créé dynamiquement. L'ordre s'inversera à l'aide d'un objet présent au début de la page adr.ejs.

*/


app.get('/trier/:cle/:ordre', (req, res) => {

	let cle = req.params.cle
	let ordre = (req.params.ordre == 'asc' ? 1 : -1)
 	let cursor = db.collection('adresse').find().sort(cle, ordre).toArray(function(err, resultat){
 	
 		ordre = (ordre == 1 ? 'desc' : 'asc')
 		//objOrdre[cle] = ordre;
 		res.render('adresses.ejs', {adresses: resultat, cle, ordre})

 	})

 	
})



/*

	Cette fonction permet d'ajouter ou de modifier, selon le cas, un membre à la liste. Il y aura une distinction entre le bouton Ajouter et le bouton Sauver. 
	Le bouton Sauver prendre l'information du membre présent sur la même ligne dans la page EJS et l'enverra à la base de données afin de modifier le ID correspondant.
	Le bouton Ajouter créera une nouvelle entrée, un nouveau ID automatiquement dans la base de donnée lorsqu'il sera appuyé.

*/


app.post('/modifier', (req, res) => {

	console.log('req.body' + req.body['_id'])
	const ObjectID = require('mongodb').ObjectID;

	 if (req.body['_id'] != '')
	 { 
		console.log('sauvegarde') 
		var oModif = {
			 "_id": ObjectID(req.body['_id']), 
			 nom: req.body.nom,
			 prenom:req.body.prenom, 
			 telephone:req.body.telephone,
			 courriel:req.body.courriel,
			 ville:req.body.ville
	 	}

		var util = require("util");
		console.log('util = ' + util.inspect(oModif));

	 }
	 else
	 {
		 console.log('insert')
		 console.log(req.body)
		 var oModif = {
			 nom: req.body.nom,
			 prenom:req.body.prenom, 
			 telephone:req.body.telephone,
			 courriel:req.body.courriel,
			 ville:req.body.ville
		 }
	 }

		 db.collection('adresse').save(oModif, (err, result) => {
		 if (err) return console.log(err)
		 console.log('sauvegarder dans la BD')
		 res.redirect('/list')

 		})

})


/*

	Cette fonction permet de détruire l'élément du tableau choisi. Elle enverra l'information nécessaire à la base de données qui, de son côté, retirera le nom de la personne ciblée.

*/

app.get('/detruire/:id', (req, res) => {
 var id = req.params.id
 const ObjectID = require('mongodb').ObjectID;
 console.log(id)
 db.collection('adresse')
 .findOneAndDelete({"_id": ObjectID(req.params.id)}, (err, resultat) => {

if (err) return console.log(err)
 res.redirect('/list')  // redirige vers la route qui affiche la collection
 })

})


/*

	Cette fonction sera appelée lorsque l'utilisateur appuyera sur l'onglet "Peupler". Cet onglet permettra d'ajouter 10 nouveaux membres générés de façon aléatoire 
	(à l'aide des données contenues dans tableaux.js) dans la liste des membres. Elle ajoutera ces membres dans la base de données ainsi que dans la liste qui à l'écran.
	Pour se faire, un nouveau tableau sera généré dynamiquement.

*/


 app.get('/peupler', (req, res) => {

	const ObjectID = require('mongodb').ObjectID;
 	const peupler = require("./mes_modules/peupler");
 	let infosMembres;

 	let oModif = [];

 	for(let i = 0; i<10; i++){

 		infosMembres = peupler();

		oModif[i] = {
				 "_id": ObjectID(req.body['_id']), 
				 nom: infosMembres.nom,
				 prenom: infosMembres.prenom, 
				 telephone: infosMembres.telephone,
				 courriel: infosMembres.courriel,
				 ville : infosMembres.ville
		 }

	}

		//var util = require("util");
		//console.log('util = ' + util.inspect(oModif));

		/*==== SAVE MANY */
		db.collection('adresse').insertMany(oModif, (err, result) => {
			if (err) return console.log(err)
		 	console.log('sauvegarder dans la BD')
			res.redirect('/list')

		 })

})



app.get('/vider', (req, res) => {

	 db.collection('adresse').remove({}, (err, result) => {
			if (err) return console.log(err)
		 	console.log('vider la BD')
			res.redirect('/list')

		 });

})





app.post('/rechercher', (req, res) => {


	let cleeRecherche = req.body.rechercher;
	cleeRecherche = new RegExp("(.*)" + cleeRecherche + "(.*)", "i");
	//cleeRecherche += "i";
	console.log(cleeRecherche);
	let cursor = db.collection('adresse')
                .find({$or:[{prenom: cleeRecherche}, {nom: cleeRecherche}, {courriel: cleeRecherche}, {telephone: cleeRecherche}, {ville: cleeRecherche}]})
                .toArray(function(err, resultat){
	 if (err) return console.log(err)
	 	console.log(JSON.stringify(resultat))
	 // transfert du contenu vers la vue index.ejs (renders)
	 // affiche le contenu de la BD
	 res.render('adresses.ejs', {adresses: resultat})
	 }) ;


})




app.get('/profil/:id', (req, res) => {

 let id = req.params.id
 const ObjectID = require('mongodb').ObjectID;
 console.log(id)
 db.collection('adresse')
 .findOneAndDelete({"_id": ObjectID(req.params.id)}, (err, resultat) => {

if (err) return console.log(err)
 res.redirect('/list')  // redirige vers la route qui affiche la collection
 })

})