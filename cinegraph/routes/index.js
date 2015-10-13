exports.index = function(req, res) {
  res.render('layout');
};

exports.partials = function(req, res, err) {
  if (req.params.name)
  {
    var name = req.params.name;
  }
  else
  {
    var urlPath = req.url;
    var pieces = urlPath.split(/[\s/]+/);
    var name = pieces[pieces.length-1];
  }
  res.render(name);
};
