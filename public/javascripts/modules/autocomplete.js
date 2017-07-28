function autocomplete(input, latInput, lngInput) {
  console.log('a');
  if (!input) return;

  const dropdown = new google.maps.places.Autocomplete(input);

  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });

  // If someone hits enter on the address field, don't submit the form
  input.on('keydown', function (e) {
    if (e.keyCode === 13) e.preventDefault();
  });
}

export default autocomplete;