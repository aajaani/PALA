$(function() {
    console.log( "ready!" );
    $(".custom-file-input").on("change", function() {
        var fileName = $(this).val()//.split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
      });

    addListeners();
});

function addListeners(){
    $(".input-group-append").click(fileSubmit);
}

function fileSubmit(){
    console.log(this.previousElementSibling.firstElementChild.value);
    console.log(this.previousElementSibling.firstElementChild.files);
}