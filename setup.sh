docker-compose run admin npm install
docker-compose run web npm install
docker-compose run worker npm install
docker-compose run worker2 npm install
docker-compose run sync-engine npm install
docker-compose run notification npm install

docker-compose run web npm run angular2-sdk

