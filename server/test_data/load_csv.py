import csv
import pymongo
print('Connecting to Database')
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["atelier_ratings"]
Reviews = db['reviews']
ReviewsMetas = db['reviewsmetas']
import time

def load_file(filename, process_func, save_func=None):
    f = open(filename)
    line = f.readline()[:-1]
    keys = line.split(',')
    indexes = {}
    resultList = []
    line_no = 1
    t = time.time()

    while True:# and line_no < 1_0:
        try:
            line = f.readline()[:-1]
            if line:
                line_data = ['{}'.format(x) for x in list(csv.reader([line], delimiter=',', quotechar='"'))[0]]
                line_obj = {}
                for i in range(len(keys)):
                    if line_data[i] == 'null':
                        line_obj[keys[i]] = None
                    else:
                        line_obj[keys[i]] = line_data[i]
                index = line_obj['id']
                line_obj = process_func(line_obj)
                if line_obj:
                    resultList.append(line_obj)
                    indexes[index] = len(resultList) - 1
            else:
                break
        except KeyboardInterrupt:
            print('Aborting on line %i. Last item:' % (line_no))
            print(resultList[-1])
            break
        if time.time() - t > 1:
            print(line_no, end='\r')
            t = time.time()
        line_no += 1
        if save_func and len(resultList) >= 500_000:
            print(line_no, end=' ')
            save_func(resultList)
            indexes = {}
            resultList = []


    if save_func:
        print(line_no, end=' ')
        save_func(resultList)
        indexes = {}
        resultList = []
    f.close()

def store_reviews(reviews):
    print('Storing Reviews')
    Reviews.insert_many(reviews, False)

def dummy_func(line_obj):
    pass

def to_bool(key):
    if key == '1' or key == 'true' or key == True:
        return 'false'
    else:
        return 'true'

def process_review(review):
    review['review_id'] = review['id']

    if not review['product_id'] in product_rating_map:
        product_rating_map[review['product_id']] = {}
    if not review['rating'] in product_rating_map[review['product_id']]:
        product_rating_map[review['product_id']][review['rating']] = 0
    product_rating_map[review['product_id']][review['rating']] += 1

    recommend_key = to_bool(review['recommend'])

    if not review['product_id'] in product_recommend_map:
        product_recommend_map[review['product_id']] = {}
    if not recommend_key in product_recommend_map[review['product_id']]:
        product_recommend_map[review['product_id']][recommend_key] = 0
    product_recommend_map[review['product_id']][recommend_key] += 1

    if review['id'] in reviews_photos_map:
        review['photos'] = reviews_photos_map[review['id']]
    del review['id']
    return review

def process_review_photos(photo):
    review_id = photo['review_id']
    del photo['review_id']
    if not review_id in reviews_photos_map:
        reviews_photos_map[review_id] = []
    reviews_photos_map[review_id].append(photo)

def process_characteristic(ch):
    chr_name_map[ch['id']] = (ch['name'], ch['product_id'])

def process_chr_reviews(ch):
    ch_id = ch['characteristic_id']
    product_id = chr_name_map[ch_id][1]
    ch_name = chr_name_map[ch_id][0]
    if not product_id in product_chr_map:
        product_chr_map[product_id] = {}
    if not ch_name in product_chr_map[product_id]:
        product_chr_map[product_id][ch_name] = { 'id': int(ch_id), 'value': 0 }
    try:
        product_chr_map[product_id][ch_name]['value'] += int(ch['value'])
    except ValueError:
        print('Invalid value in product %s: %s' % (product_id, ch['value']))
    if not product_id in product_review_count_map:
        product_review_count_map[product_id] = 0
    product_review_count_map[product_id] += 1

ReviewsMetas.create_index('product_id')
Reviews.create_index('product_id')
Reviews.create_index('review_id')
reviews_photos_map = {}
product_rating_map = {}
product_recommend_map = {}
print('Loading Review Photos')
load_file('reviews_photos.csv', process_review_photos)
print('Loading Reviews')
load_file('reviews.csv', process_review, store_reviews)
print('Reviews Stored')
del reviews_photos_map

chr_name_map = {}
print('Loading Product Characteristics')
load_file('characteristics.csv', process_characteristic)
product_chr_map = {}
product_review_count_map = {}
print('Loading Review Characteristics Data')
load_file('characteristic_reviews.csv', process_chr_reviews)

reviews_metadata = []
print('Generating Reviews Metadata')
for i in product_review_count_map:
    total = product_review_count_map[i]
    nOChrs = len(product_chr_map[i])
    metadata = {
        'product_id': i,
        'total_reviews': total // nOChrs,
        'ratings': product_rating_map[i],
        'recommended': product_recommend_map[i],
        'characteristics': product_chr_map[i]
    }
    reviews_metadata.append(metadata)
print('Storing Reviews Metadata')
ReviewsMetas.insert_many(reviews_metadata, False)
