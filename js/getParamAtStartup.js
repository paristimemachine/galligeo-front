// UEL Galligeo with an akr as params
const urlParams = new URLSearchParams(window.location.search);
// urlParams.forEach((value, key) => {
//     console.log(`${key}: ${value}`);
// });
ark = urlParams.get('ark');

if(ark) {
    document.getElementById('search-784-input').value = base_url + ark;
    load_ark_picture();
}