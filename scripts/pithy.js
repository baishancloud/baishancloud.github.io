$(function(){
    $('#tab1').mouseover(function(event) {
        $(this).addClass('tab_active');
        $('#tab2').removeClass('tab_active');
        $('#tab3').removeClass('tab_active');
        $('#tab4').removeClass('tab_active');
        $('#content1').fadeOut();
        $('#content2').fadeOut();
        $('#content3').fadeOut();
        $('#content4').fadeOut();
        setTimeout(function() {
            $('#content1').fadeIn();
        }, 300);
        
    });
    $('#tab2').mouseover(function(event) {
        $(this).addClass('tab_active');
        $('#tab1').removeClass('tab_active');
        $('#tab3').removeClass('tab_active');
        $('#tab4').removeClass('tab_active');
        $('#content1').fadeOut();
        $('#content2').fadeOut();
        $('#content3').fadeOut();
        $('#content4').fadeOut();
        setTimeout(function() {
            $('#content2').fadeIn();
        }, 300);
        
    });
    $('#tab3').mouseover(function(event) {
        $(this).addClass('tab_active');
        $('#tab1').removeClass('tab_active');
        $('#tab2').removeClass('tab_active');
        $('#tab4').removeClass('tab_active');
        $('#content1').fadeOut();
        $('#content2').fadeOut();
        $('#content3').fadeOut();
        $('#content4').fadeOut();
        setTimeout(function() {
            $('#content3').fadeIn();
        }, 300);
        
    });
    $('#tab4').mouseover(function(event) {
        $(this).addClass('tab_active');
        $('#tab1').removeClass('tab_active');
        $('#tab2').removeClass('tab_active');
        $('#tab3').removeClass('tab_active');
        $('#content1').fadeOut();
        $('#content2').fadeOut();
        $('#content3').fadeOut();
        $('#content4').fadeOut();
        setTimeout(function() {
            $('#content4').fadeIn();
        }, 300);
        
    });


    $("#gotop").click(function(){
        jQuery("html,body").animate({
            scrollTop:0
        }, 500);
    });
    $(window).load(function() {
		$('#gotop').hide();
        $('.am-slider').flexslider();
    })
    
    $(window).scroll(function() {
        if ( $(this).scrollTop() > 300){
            $('#gotop').fadeIn("fast");
        } else {
            $('#gotop').stop().fadeOut("fast");
        }
    });
    var $slider = $('#demo-slider-0');
    var counter = 0;
    var getSlide = function() {
      counter++;
      return '<li><img src="http://s.amazeui.org/media/i/demos/bing-' +
        (Math.floor(Math.random() * 4) + 1) + '.jpg" />' +
        '<div class="am-slider-desc">动态插入的 slide ' + counter + '</div></li>';
    };
});

