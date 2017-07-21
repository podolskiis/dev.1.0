$(function(){















// RESIZE
$(window).on('resize', function() {
  // function...
}); $(window).trigger('resize');

// LOAD
$(window).on('load', function() {
  // function...
  $(window).trigger('resize');
});

}); // END READY
