"""Generates src/data/districts.json and src/data/upazilas.json.
Coordinates are approximate district centres (for weather lookup + stylised map only).
Hazard tags are illustrative groupings for education, not an official hazard map."""
import json, pathlib

D = [
 # id, bn, en, divBn, divEn, lat, lon, hazards
 ("dhaka","ঢাকা","Dhaka","ঢাকা","Dhaka",23.81,90.41,[]),
 ("gazipur","গাজীপুর","Gazipur","ঢাকা","Dhaka",24.00,90.42,[]),
 ("narayanganj","নারায়ণগঞ্জ","Narayanganj","ঢাকা","Dhaka",23.62,90.50,["flood"]),
 ("narsingdi","নরসিংদী","Narsingdi","ঢাকা","Dhaka",23.92,90.72,[]),
 ("manikganj","মানিকগঞ্জ","Manikganj","ঢাকা","Dhaka",23.86,90.00,["flood","river-erosion"]),
 ("munshiganj","মুন্সীগঞ্জ","Munshiganj","ঢাকা","Dhaka",23.54,90.53,["flood"]),
 ("tangail","টাঙ্গাইল","Tangail","ঢাকা","Dhaka",24.25,89.92,["flood"]),
 ("kishoreganj","কিশোরগঞ্জ","Kishoreganj","ঢাকা","Dhaka",24.44,90.78,["flash-flood"]),
 ("faridpur","ফরিদপুর","Faridpur","ঢাকা","Dhaka",23.61,89.84,["flood"]),
 ("rajbari","রাজবাড়ী","Rajbari","ঢাকা","Dhaka",23.76,89.64,["flood","river-erosion"]),
 ("gopalganj","গোপালগঞ্জ","Gopalganj","ঢাকা","Dhaka",23.01,89.83,["flood"]),
 ("madaripur","মাদারীপুর","Madaripur","ঢাকা","Dhaka",23.17,90.19,["flood","river-erosion"]),
 ("shariatpur","শরীয়তপুর","Shariatpur","ঢাকা","Dhaka",23.24,90.43,["flood","river-erosion"]),
 ("chattogram","চট্টগ্রাম","Chattogram","চট্টগ্রাম","Chattogram",22.36,91.78,["cyclone","salinity"]),
 ("coxsbazar","কক্সবাজার","Cox's Bazar","চট্টগ্রাম","Chattogram",21.43,92.01,["cyclone","salinity"]),
 ("cumilla","কুমিল্লা","Cumilla","চট্টগ্রাম","Chattogram",23.46,91.18,[]),
 ("feni","ফেনী","Feni","চট্টগ্রাম","Chattogram",23.02,91.40,["flash-flood","cyclone"]),
 ("noakhali","নোয়াখালী","Noakhali","চট্টগ্রাম","Chattogram",22.87,91.10,["cyclone","salinity"]),
 ("lakshmipur","লক্ষ্মীপুর","Lakshmipur","চট্টগ্রাম","Chattogram",22.94,90.83,["cyclone","salinity"]),
 ("chandpur","চাঁদপুর","Chandpur","চট্টগ্রাম","Chattogram",23.23,90.67,["flood","river-erosion"]),
 ("brahmanbaria","ব্রাহ্মণবাড়িয়া","Brahmanbaria","চট্টগ্রাম","Chattogram",23.96,91.11,[]),
 ("rangamati","রাঙ্গামাটি","Rangamati","চট্টগ্রাম","Chattogram",22.65,92.17,[]),
 ("khagrachhari","খাগড়াছড়ি","Khagrachhari","চট্টগ্রাম","Chattogram",23.12,91.98,[]),
 ("bandarban","বান্দরবান","Bandarban","চট্টগ্রাম","Chattogram",22.20,92.22,[]),
 ("rajshahi","রাজশাহী","Rajshahi","রাজশাহী","Rajshahi",24.37,88.60,["drought"]),
 ("chapainawabganj","চাঁপাইনবাবগঞ্জ","Chapainawabganj","রাজশাহী","Rajshahi",24.60,88.27,["drought"]),
 ("naogaon","নওগাঁ","Naogaon","রাজশাহী","Rajshahi",24.80,88.95,["drought"]),
 ("natore","নাটোর","Natore","রাজশাহী","Rajshahi",24.42,89.00,["drought"]),
 ("bogura","বগুড়া","Bogura","রাজশাহী","Rajshahi",24.85,89.37,["flood","river-erosion"]),
 ("joypurhat","জয়পুরহাট","Joypurhat","রাজশাহী","Rajshahi",25.10,89.02,["drought"]),
 ("pabna","পাবনা","Pabna","রাজশাহী","Rajshahi",24.00,89.24,["flood"]),
 ("sirajganj","সিরাজগঞ্জ","Sirajganj","রাজশাহী","Rajshahi",24.45,89.70,["flood","river-erosion"]),
 ("khulna","খুলনা","Khulna","খুলনা","Khulna",22.82,89.55,["salinity","cyclone"]),
 ("bagerhat","বাগেরহাট","Bagerhat","খুলনা","Khulna",22.66,89.79,["salinity","cyclone"]),
 ("satkhira","সাতক্ষীরা","Satkhira","খুলনা","Khulna",22.72,89.07,["salinity","cyclone"]),
 ("jashore","যশোর","Jashore","খুলনা","Khulna",23.17,89.21,[]),
 ("jhenaidah","ঝিনাইদহ","Jhenaidah","খুলনা","Khulna",23.54,89.15,["drought"]),
 ("magura","মাগুরা","Magura","খুলনা","Khulna",23.49,89.42,[]),
 ("narail","নড়াইল","Narail","খুলনা","Khulna",23.17,89.50,[]),
 ("kushtia","কুষ্টিয়া","Kushtia","খুলনা","Khulna",23.90,89.12,["drought"]),
 ("chuadanga","চুয়াডাঙ্গা","Chuadanga","খুলনা","Khulna",23.64,88.84,["drought"]),
 ("meherpur","মেহেরপুর","Meherpur","খুলনা","Khulna",23.76,88.63,["drought"]),
 ("barishal","বরিশাল","Barishal","বরিশাল","Barishal",22.70,90.37,["flood"]),
 ("bhola","ভোলা","Bhola","বরিশাল","Barishal",22.69,90.65,["cyclone","salinity","river-erosion"]),
 ("patuakhali","পটুয়াখালী","Patuakhali","বরিশাল","Barishal",22.36,90.33,["cyclone","salinity"]),
 ("barguna","বরগুনা","Barguna","বরিশাল","Barishal",22.15,90.12,["cyclone","salinity"]),
 ("pirojpur","পিরোজপুর","Pirojpur","বরিশাল","Barishal",22.58,89.97,["cyclone","salinity"]),
 ("jhalokathi","ঝালকাঠি","Jhalokathi","বরিশাল","Barishal",22.64,90.20,["flood"]),
 ("sylhet","সিলেট","Sylhet","সিলেট","Sylhet",24.89,91.87,["flash-flood"]),
 ("moulvibazar","মৌলভীবাজার","Moulvibazar","সিলেট","Sylhet",24.48,91.78,["flash-flood"]),
 ("habiganj","হবিগঞ্জ","Habiganj","সিলেট","Sylhet",24.37,91.42,["flash-flood"]),
 ("sunamganj","সুনামগঞ্জ","Sunamganj","সিলেট","Sylhet",25.07,91.40,["flash-flood"]),
 ("rangpur","রংপুর","Rangpur","রংপুর","Rangpur",25.75,89.25,["drought"]),
 ("dinajpur","দিনাজপুর","Dinajpur","রংপুর","Rangpur",25.63,88.64,["drought"]),
 ("thakurgaon","ঠাকুরগাঁও","Thakurgaon","রংপুর","Rangpur",26.03,88.47,["drought"]),
 ("panchagarh","পঞ্চগড়","Panchagarh","রংপুর","Rangpur",26.34,88.55,["drought"]),
 ("nilphamari","নীলফামারী","Nilphamari","রংপুর","Rangpur",25.93,88.86,["drought"]),
 ("lalmonirhat","লালমনিরহাট","Lalmonirhat","রংপুর","Rangpur",25.92,89.45,["flood","river-erosion"]),
 ("kurigram","কুড়িগ্রাম","Kurigram","রংপুর","Rangpur",25.81,89.64,["flood","river-erosion"]),
 ("gaibandha","গাইবান্ধা","Gaibandha","রংপুর","Rangpur",25.33,89.53,["flood","river-erosion"]),
 ("mymensingh","ময়মনসিংহ","Mymensingh","ময়মনসিংহ","Mymensingh",24.75,90.41,[]),
 ("jamalpur","জামালপুর","Jamalpur","ময়মনসিংহ","Mymensingh",24.92,89.95,["flood","river-erosion"]),
 ("sherpur","শেরপুর","Sherpur","ময়মনসিংহ","Mymensingh",25.02,90.02,["flash-flood"]),
 ("netrokona","নেত্রকোনা","Netrokona","ময়মনসিংহ","Mymensingh",24.88,90.73,["flash-flood"]),
]
assert len(D) == 64, len(D)

U = {
 "dhaka": [("savar","সাভার","Savar"),("dhamrai","ধামরাই","Dhamrai"),("keraniganj","কেরানীগঞ্জ","Keraniganj"),("nawabganj","নবাবগঞ্জ","Nawabganj"),("dohar","দোহার","Dohar")],
 "gazipur": [("kaliakair","কালিয়াকৈর","Kaliakair"),("kapasia","কাপাসিয়া","Kapasia"),("sreepur","শ্রীপুর","Sreepur"),("kaliganj","কালীগঞ্জ","Kaliganj")],
 "rajshahi": [("paba","পবা","Paba"),("godagari","গোদাগাড়ী","Godagari"),("tanore","তানোর","Tanore"),("bagha","বাঘা","Bagha"),("puthia","পুঠিয়া","Puthia"),("charghat","চারঘাট","Charghat")],
 "bogura": [("sherpur-bogura","শেরপুর","Sherpur"),("shibganj","শিবগঞ্জ","Shibganj"),("dhunat","ধুনট","Dhunat"),("gabtali","গাবতলী","Gabtali"),("sariakandi","সারিয়াকান্দি","Sariakandi")],
 "mymensingh": [("trishal","ত্রিশাল","Trishal"),("bhaluka","ভালুকা","Bhaluka"),("muktagacha","মুক্তাগাছা","Muktagacha"),("phulpur","ফুলপুর","Phulpur"),("gafargaon","গফরগাঁও","Gafargaon")],
 "sylhet": [("beanibazar","বিয়ানীবাজার","Beanibazar"),("golapganj","গোলাপগঞ্জ","Golapganj"),("jaintiapur","জৈন্তাপুর","Jaintiapur"),("kanaighat","কানাইঘাট","Kanaighat")],
 "khulna": [("dumuria","ডুমুরিয়া","Dumuria"),("batiaghata","বটিয়াঘাটা","Batiaghata"),("dacope","দাকোপ","Dacope"),("koyra","কয়রা","Koyra"),("paikgachha","পাইকগাছা","Paikgachha")],
 "rangpur": [("mithapukur","মিঠাপুকুর","Mithapukur"),("pirganj","পীরগঞ্জ","Pirganj"),("badarganj","বদরগঞ্জ","Badarganj"),("kaunia","কাউনিয়া","Kaunia"),("gangachara","গংগাচড়া","Gangachara")],
 "cumilla": [("chandina","চান্দিনা","Chandina"),("daudkandi","দাউদকান্দি","Daudkandi"),("laksam","লাকসাম","Laksam"),("burichang","বুড়িচং","Burichang"),("debidwar","দেবিদ্বার","Debidwar")],
 "barishal": [("bakerganj","বাকেরগঞ্জ","Bakerganj"),("babuganj","বাবুগঞ্জ","Babuganj"),("gournadi","গৌরনদী","Gournadi"),("muladi","মুলাদী","Muladi"),("agailjhara","আগৈলঝাড়া","Agailjhara")],
 "dinajpur": [("birganj","বীরগঞ্জ","Birganj"),("parbatipur","পার্বতীপুর","Parbatipur"),("phulbari","ফুলবাড়ী","Phulbari"),("chirirbandar","চিরিরবন্দর","Chirirbandar")],
 "noakhali": [("begumganj","বেগমগঞ্জ","Begumganj"),("hatiya","হাতিয়া","Hatiya"),("senbagh","সেনবাগ","Senbagh"),("subarnachar","সুবর্ণচর","Subarnachar")],
 "satkhira": [("assasuni","আশাশুনি","Assasuni"),("debhata","দেবহাটা","Debhata"),("kalaroa","কলারোয়া","Kalaroa"),("shyamnagar","শ্যামনগর","Shyamnagar"),("tala","তালা","Tala")],
}

root = pathlib.Path(__file__).resolve().parent.parent / "src" / "data"
districts = [dict(id=i, nameBn=b, nameEn=e, divisionBn=db, divisionEn=de, lat=la, lon=lo, hazards=h) for i,b,e,db,de,la,lo,h in D]
(root/"districts.json").write_text(json.dumps(districts, ensure_ascii=False, indent=1))
ups = [dict(id=f"{d}-{u}", districtId=d, nameBn=b, nameEn=e) for d, lst in U.items() for (u,b,e) in lst]
(root/"upazilas.json").write_text(json.dumps(ups, ensure_ascii=False, indent=1))
print(len(districts), "districts;", len(ups), "upazilas (sample)")
