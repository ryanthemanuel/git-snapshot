FROM docker-integration.cernerrepos.net/ion/ion-node:1.7.0

# run the server
CMD ["npm", "run", "start-static"]
