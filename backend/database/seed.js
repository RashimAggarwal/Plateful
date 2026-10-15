import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../src/config/db.js';
import { User, Restaurant, MenuItem, Order, Delivery, Review } from '../src/models.js';

const accounts=[['Demo Customer','customer@plateful.demo','customer'],['Demo Owner','owner@plateful.demo','owner'],['Demo Agent','agent@plateful.demo','delivery'],['Demo Admin','admin@plateful.demo','admin']];
const places=[
 {name:'Saffron & Stone',cuisine:'Pizza · Mediterranean',description:'Wood-fired vegetarian pizzas, garden salads, and bright Mediterranean flavors.',address:'14 Market Street',image:'photo-1513104890138-7c749659a591'},
 {name:'Sunday Table',cuisine:'Italian',description:'Handmade pasta, slow-simmered sauces, and a seat saved for you.',address:'88 Willow Avenue',image:'photo-1473093295043-cdd812d0e601'},
 {name:'Little Leaf Kitchen',cuisine:'Healthy',description:'Colorful bowls and crisp greens, made with the season.',address:'6 Garden Lane',image:'photo-1512621776951-a57141f2eefd'},
 {name:'Greenhouse Grill',cuisine:'Burgers',description:'Big, satisfying plant-based burgers with fresh toppings and golden sides.',address:'21 Orchard Road',image:'photo-1629680871149-434f75071693'},
 {name:'Casa Verde',cuisine:'Mexican',description:'Bright, colorful Mexican favorites made with beans, vegetables, and fresh herbs.',address:'45 Sol Street',image:'photo-1647403352872-8cab902fe18d'},
 {name:'Bamboo Garden',cuisine:'Asian',description:'Comforting noodle bowls, tofu, and crisp vegetables with fragrant sauces.',address:'9 Lantern Lane',image:'https://www.unileverfoodsolutions.com.tr/konsept-uygulamalarimiz/dunya-mutfagi/noodle-tarifleri-noodle-cesitleri/jcr:content/parsys/content/image_713528347_copy_1253635841.img.jpg/1632345625952.jpg'},
 {name:'The Sweet Fig',cuisine:'Dessert',description:'Lovely little cakes and sweet treats for a happy ending.',address:'3 Honeycomb Court',image:'photo-1578985545062-69928b1d9587'}
];
const dishes=[
 {restaurant:0,name:'Garden Margherita Pizza',description:'Stone-baked sourdough, bright tomato, creamy mozzarella, and fragrant basil.',ingredients:['Sourdough crust','San Marzano tomato','Fresh mozzarella','Basil','Extra-virgin olive oil'],category:'Pizza',price:15.5,offer_price:13.5,image:'photo-1513104890138-7c749659a591',spice_level:'Mild',serves:1,calories:640,bestseller:true,allergens:['Gluten','Milk']},
 {restaurant:0,name:'Paneer Tikka Pizza',description:'Smoky tandoori paneer, peppers, red onion, and cooling mint yogurt.',ingredients:['Sourdough crust','Tandoori paneer','Bell peppers','Red onion','Mint yogurt','Mozzarella'],category:'Pizza',price:17.5,image:'photo-1665033628673-7de125eb6b12',spice_level:'Medium',serves:1,calories:720,bestseller:true,allergens:['Gluten','Milk']},
 {restaurant:1,name:'Wild Mushroom Truffle Orzo',description:'Silky parmesan orzo with golden mushrooms, thyme, and a little truffle.',ingredients:['Orzo pasta','Cremini mushrooms','Parmesan','Fresh thyme','Truffle oil'],category:'Pasta',price:16,offer_price:14.5,image:'photo-1473093295043-cdd812d0e601',spice_level:'None',serves:1,calories:560,bestseller:true,allergens:['Gluten','Milk']},
 {restaurant:2,name:'Crispy Halloumi Garden Bowl',description:'Grilled halloumi, warm grains, crunchy greens, and lemon tahini.',ingredients:['Halloumi','Quinoa','Baby spinach','Cucumber','Cherry tomato','Lemon tahini'],category:'Fresh bowls',price:14.5,image:'photo-1512621776951-a57141f2eefd',spice_level:'None',serves:1,calories:490,allergens:['Milk','Sesame']},
 {restaurant:1,name:'Basil Pesto Rigatoni',description:'Hand-cut rigatoni tossed in basil pesto with blistered tomatoes.',ingredients:['Rigatoni','Basil pesto','Blistered cherry tomato','Pine nuts','Pecorino'],category:'Pasta',price:15,image:'photo-1547592180-85f173990554',spice_level:'Mild',serves:1,calories:530,allergens:['Gluten','Milk','Tree nuts']},
 {restaurant:2,name:'Dark Chocolate Olive Oil Cake',description:'Deep cocoa, fruity olive oil, and softly whipped mascarpone.',ingredients:['Dark chocolate','Cocoa','Olive oil','Flour','Mascarpone'],category:'Dessert',price:8,image:'photo-1578985545062-69928b1d9587',spice_level:'None',serves:1,calories:390,allergens:['Gluten','Milk']},
 {restaurant:3,name:'Smoky Garden Veggie Burger',description:'A golden vegetable patty with crisp lettuce, tomato, pickles, and house sauce.',ingredients:['Vegetable patty','Brioche bun','Lettuce','Tomato','Pickles','House sauce'],category:'Burgers',price:13.5,offer_price:12,image:'photo-1629680871149-434f75071693',spice_level:'Mild',serves:1,calories:590,bestseller:true,allergens:['Gluten','Milk','Egg']},
 {restaurant:3,name:'Crispy Chickpea Smash Burger',description:'Crispy chickpea patty, creamy avocado, crunchy slaw, and lemon herb mayo.',ingredients:['Chickpea patty','Potato bun','Avocado','Cabbage slaw','Lemon herb mayo'],category:'Burgers',price:14,image:'photo-1629680871149-434f75071693',spice_level:'Mild',serves:1,calories:620,allergens:['Gluten','Egg']},
 {restaurant:4,name:'Roasted Cauliflower Street Tacos',description:'Warm corn tortillas with spiced cauliflower, black beans, lime crema, and fresh salsa.',ingredients:['Corn tortillas','Roasted cauliflower','Black beans','Pico de gallo','Lime crema','Cilantro'],category:'Mexican',price:12.5,offer_price:11,image:'photo-1647403352872-8cab902fe18d',spice_level:'Medium',serves:2,calories:460,bestseller:true,allergens:['Milk']},
 {restaurant:4,name:'Sweet Potato & Black Bean Bowl',description:'Roasted sweet potato, black beans, avocado, corn, and smoky chipotle dressing.',ingredients:['Sweet potato','Black beans','Avocado','Corn','Brown rice','Chipotle dressing'],category:'Mexican',price:14,image:'photo-1512621776951-a57141f2eefd',spice_level:'Medium',serves:1,calories:520,allergens:[]},
 {restaurant:5,name:'Ginger Sesame Veggie Noodles',description:'Wok-tossed noodles with colorful vegetables, ginger, sesame, and a savory soy glaze.',ingredients:['Wheat noodles','Red bell pepper','Carrot','Zucchini','Ginger','Sesame','Soy glaze'],category:'Asian',price:14.5,image:'https://www.unileverfoodsolutions.com.tr/konsept-uygulamalarimiz/dunya-mutfagi/noodle-tarifleri-noodle-cesitleri/jcr:content/parsys/content/image_713528347_copy_1253635841.img.jpg/1632345625952.jpg',spice_level:'Mild',serves:1,calories:510,bestseller:true,allergens:['Gluten','Soy','Sesame']},
 {restaurant:5,name:'Mushroom & Tofu Ramen',description:'A comforting vegetable broth with tofu, mushrooms, bok choy, and spring onions.',ingredients:['Ramen noodles','Vegetable broth','Tofu','Shiitake mushrooms','Bok choy','Spring onion'],category:'Asian',price:16,image:'https://lopnor.mx/static/lopnor/imgs/menu-yasai-vegetarian.jpg',spice_level:'Mild',serves:1,calories:480,allergens:['Gluten','Soy']},
 {restaurant:6,name:'Chocolate Berry Celebration Cake',description:'Rich chocolate cake layered with silky cream and topped with fresh berries.',ingredients:['Cocoa','Flour','Dark chocolate','Cream','Strawberries','Blueberries'],category:'Dessert',price:9.5,image:'photo-1578985545062-69928b1d9587',spice_level:'None',serves:2,calories:440,bestseller:true,allergens:['Gluten','Milk','Egg']},
 {restaurant:6,name:'Vanilla Berry Cheesecake',description:'Creamy vanilla cheesecake with a buttery crumb and bright berry compote.',ingredients:['Cream cheese','Vanilla','Biscuit crumb','Berry compote','Butter'],category:'Dessert',price:8.5,image:'photo-1578985545062-69928b1d9587',spice_level:'None',serves:1,calories:410,allergens:['Gluten','Milk']}
];

const imageUrl=(image,width)=>image.startsWith('http')?image:`https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=85`;

try{
  await connectDatabase();
  const users={};
  for(const [name,email,role] of accounts){const password_hash=await bcrypt.hash('Plateful2026!',12);users[role]=await User.findOneAndUpdate({email},{ $setOnInsert:{name,email,password_hash,role,phone:'+1 555 0100'}},{upsert:true,new:true});}
  const restaurants=[];
  for(let i=0;i<places.length;i++){const {image,...p}=places[i];restaurants[i]=await Restaurant.findOneAndUpdate({name:p.name},{$set:{...p,phone:'+1 555 0199',image_url:imageUrl(image,1200),pure_veg:true,approved:true,featured:i<2},$setOnInsert:{owner_id:users.owner._id}},{upsert:true,new:true});}
  await MenuItem.deleteMany({restaurant_id:{$in:restaurants.map(r=>r._id)},name:{$in:['Lemon herb chicken','Wild mushroom orzo','Crispy halloumi bowl','Chocolate olive oil cake']}});
  for(const dish of dishes){const {restaurant:index,image,...details}=dish,restaurant=restaurants[index];await MenuItem.findOneAndUpdate({restaurant_id:restaurant._id,name:details.name},{$set:{...details,restaurant_id:restaurant._id,is_vegetarian:true,image_url:imageUrl(image,1000)}}, {upsert:true,new:true});}
  for(let i=0;i<restaurants.length;i++){
    const restaurant=restaurants[i];if(await Review.exists({restaurant_id:restaurant._id,customer_id:users.customer._id}))continue;
    const item=await MenuItem.findOne({restaurant_id:restaurant._id});if(!item)continue;
    const order=await Order.create({customer_id:users.customer._id,restaurant_id:restaurant._id,total:Number((item.price+2.5).toFixed(2)),delivery_address:'22 Demo Street',contact_phone:'+1 555 0100',payment_method:'cod',status:'delivered',items:[{menu_item_id:item._id,item_name:item.name,unit_price:item.price,quantity:1}]});
    await Delivery.create({order_id:order._id,agent_id:users.delivery._id,status:'delivered'});
    await Review.create({restaurant_id:restaurant._id,customer_id:users.customer._id,order_id:order._id,rating:[5,5,4][i%3],comment:['Lovely flavors and still piping hot.','The pasta was wonderful. I will be back.','Fresh, bright, and really satisfying.'][i%3]});
  }
  console.log(`Seeded ${restaurants.length} vegetarian demo restaurants, menu items, reviews, and role accounts. Shared development password: Plateful2026!`);
}finally{await mongoose.disconnect()}
