/* var number = -1;

$(document).ready(function(){
  var randombgs=["tv8J6uCTKsTlASa8luJqrFiJlBX", "xu9zaAevzQ5nnrsXN6JcahLnG4i", "9hkWw0LnWrDlcK1swe3lf2Yxiko", "tvSlBzAdRE29bZe5yYWrJ2ds137", "eNSyTprwxXrXs5amshnz2R2GKod"];
  if (number == -1)
  {
    number = Math.floor(Math.random() * randombgs.length);
  }
  $('#bg').css({'background-image': 'url(http://image.tmdb.org/t/p/w1000/' + randombgs[number] + '.jpg)'});
});
*/

var number = -1;

$(document).ready(function(){
  var randombgs=["bladerunner", "wolf", "shining", "starwarsepv", "starwarsepvii", "fromdusk", "bladerunner", "theavengers", "attacktheblock", "her"];
  if (number == -1)
  {
    number = Math.floor(Math.random() * randombgs.length);
  }
  $('#sourcevid').attr({'src':  'videos/' + randombgs[number] + '.webm'});
  //$('#bgvid').attr({'poster': randombgs[number] + '.jpg'});
  $('#bgvid').css({'background-image': 'url(../videos/' + randombgs[number] + '.jpg)'})
  $('#bgvid').get(0).load();
  $('#bgvid').get(0).play();

  $("#bgvid").animate({opacity: 1}, 3000);
});
