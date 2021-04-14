FROM node:12

WORKDIR /opt/assessment

#copy package.json file
COPY package.json /opt/assessment

#install node packges
RUN npm install

#copy all files 
COPY . /opt/assessment

#expose the application port
EXPOSE 3000

#start the application
CMD node app.js
