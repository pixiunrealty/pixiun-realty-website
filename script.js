function openDetails(title, location, price){
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalLocation').textContent=location;
  document.getElementById('modalPrice').textContent=price;
  document.getElementById('modal').classList.add('show');
}
function closeDetails(){document.getElementById('modal').classList.remove('show')}
function submitForm(e){
  e.preventDefault();
  alert('Thank you. Your inquiry form is working in this demo. In the production site, this will send the inquiry to your Pixiun Realty dashboard/email.');
  e.target.reset();
}
function searchProperties(){
  document.getElementById('properties').scrollIntoView({behavior:'smooth'});
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetails()});
