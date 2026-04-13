# Initialize the Azure Function project
mkdir ado-gh-trigger
cd ado-gh-trigger
func init . --javascript
func new --name devops-workitem-webhook --template "HTTP trigger" --authlevel function

# Install dependencies
npm install
