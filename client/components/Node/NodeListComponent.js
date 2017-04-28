import csv from 'csv-string';
import React from 'react';
import moment from 'moment';

import { Link } from 'react-router';

import FloatingActionButton from 'material-ui/FloatingActionButton';
import ContentAdd from 'material-ui/svg-icons/content/add';
import ActionNoteAdd from 'material-ui/svg-icons/action/note-add';
import RaisedButton from 'material-ui/RaisedButton';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import Divider from 'material-ui/Divider';
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField';
import CircularProgress from 'material-ui/CircularProgress';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';

import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn
} from 'material-ui/Table';

import {
  refs,
} from '../../util/firebase';

import {
  client,
  clientInit
} from '../../util/lokka';


export default class NodeList extends React.Component {
  // static propTypes = {
  //   viewer: React.PropTypes.object.isRequired
  // };

  constructor(props) {
    super(props);
    this.state = {
      createNodeModalOpen: false,
      bulkModalOpen: false,
      nodes: [],
      nodeCategory: {},
      c1: -1,
      c2: -1,
      c3: -1,
    };
  }

  componentDidMount() {
    clientInit()
    .then(() => { this.initList(); });
  }

  componentWillUnmount() {

  }

  getNodeCategoryFromServer = () => client.query(`{
    viewer {
      nodeCategory
    }
  }`).then(response => JSON.parse(response.viewer.nodeCategory));

  getCategoryNumber = (c1String, c2String) => {
    let c1 = 999; // default category
    let c2 = 999;
    if (!c1String) {
      return { c1, c2 };
    }
    const category1 = Object.keys(this.state.nodeCategory)
      .map(key => ({ [`${key}`]: this.state.nodeCategory[key].name }))
      .filter(el => Object.values(el)[0] === c1String);
    if (category1[0]) {
      c1 = Number(Object.keys(category1[0])[0]);
    }
    if (c1 !== 999) {
      const category2 = Object.keys(this.state.nodeCategory[c1].detail)
        .map(key => ({ [`${key}`]: this.state.nodeCategory[c1].detail[key].name }))
        .filter(el => Object.values(el)[0] === c2String);
      if (category2[0]) {
        c2 = Number(Object.keys(category2[0])[0]);
      }
    }
    return { c1, c2 };
  };

  initList() {
    refs.node.root.orderByChild('createdAt').limitToLast(20).once('value', (data) => {
      if (data.val()) {
        this.setState({ nodes: Object.keys(data.val()).map(nodeKey => data.val()[nodeKey]) });
      }
    });

    this.getNodeCategoryFromServer()
      .then((nodeCategory) => {
        this.setState({ nodeCategory });
      });
  }

  handleC1Change = (event, index, c1) => this.setState({ c1, c2: -1, c3: -1 });
  handleC2Change = (event, index, c2) => this.setState({ c2, c3: -1 });
  handleC3Change = (event, index, c3) => this.setState({ c3 });

  handleCreateNodeModalOpen = () => {
    this.setState({ createNodeModalOpen: true });
  };

  handleCreateNodeModalClose = () => {
    this.setState({ createNodeModalOpen: false });
  };

  createNodeMutation = node => client.mutate(`{
     createNodeFromAdmin(
       input:{
         n: "${node.n}",
         p: "${node.p}",
         addr: "${node.addr}",
         c1: ${node.c1},
         c2: ${node.c2},
         type: "${node.type}",
         lat: ${node.lat}
         lon: ${node.lon}
       }
     ) {
       result
     }
   }`
  );

  convertCategoryString = prevNode =>
    // prevNode.c1 = prevNode
    // prevNode.c2 =

     prevNode

  handleCreateNodeModalCreate = () => {
    this.createNodeMutation({
      n: this.nInput.getValue(),
      p: this.pInput.getValue(),
      addr: this.addrInput.getValue(),
      c1: this.c1Input.getValue(),
      c2: this.c2Input.getValue(),
      type: this.typeInput.getValue(),
      lat: this.latInput.getValue(),
      lon: this.lonInput.getValue(),
    })
      .then(() => {
        this.setState({ bulkModalOpen: false });
      })
      .catch(console.log);
  };

  createNodeObject(header, row) {
    const categories = this.getCategoryNumber(row[0], row[1]);

    return {
      [`${header[0]}`]: categories.c1,
      [`${header[1]}`]: categories.c2,
      [`${header[2]}`]: row[2],
      [`${header[3]}`]: row[3],
      [`${header[4]}`]: row[4],
      [`${header[5]}`]: row[5],
      [`${header[6]}`]: Number(row[6]),
      [`${header[7]}`]: Number(row[7]),
      type: 'non-partenerd'
    };
  }

  handleCreateNodeFromBulkModalOpen = () => {
    this.setState({ bulkModalOpen: true });
  };

  handleCreateNodeFromBulkModalClose = () => {
    this.setState({ bulkModalOpen: false });
  };

  handleCreateNodeFromBulkModalCreate = () => {
    const p = [];
    csv.forEach(this.bulkInput.getValue(), ',', (row, index) => {
      if (index === 0) {
        this.header = row;
        return;
      }
      if (row.length === 1) {
        return;
      }
      const nodeObj = this.createNodeObject(this.header, row);
      p.push(new Promise((resolve, reject) => client.mutate(`{
        createNodeFromAdmin(
          input: {
          c1: ${nodeObj.c1}
          c2: ${nodeObj.c2}
          n: "${nodeObj.n}"
          p: "${nodeObj.p}"
          addr: "${nodeObj.addr}"
          lon: ${nodeObj.lon}
          lat: ${nodeObj.lat}
          type: "${nodeObj.type}"
          }
        ) {
            result
          }
        }`
        ).then(resolve)
          .catch(reject)));
    });
    Promise.all(p)
      .then(() => {
        this.initList();
        this.setState({ bulkModalOpen: false });
      })
      .catch(console.log);
  };

  renderSpinner() {
    if (this.state.isSearching) {
      return (<CircularProgress size={25} thickness={2} />);
    }
    return null;
  }

  render() {
    const createNodeModalActions = [
      <FlatButton
        label='Cancel'
        primary
        onTouchTap={this.handleCreateNodeModalClose}
      />,
      <FlatButton
        label='Create'
        primary
        onTouchTap={this.handleCreateNodeModalCreate}
      />,
    ];

    const createNodeFromBulkModalActions = [
      <FlatButton
        label='Cancel'
        primary
        onTouchTap={this.handleCreateNodeFromBulkModalClose}
      />,
      <FlatButton
        label='Create'
        primary
        onTouchTap={this.handleCreateNodeFromBulkModalCreate}
      />,
    ];

    return (
      <div>
        <div style={{ width: '100%', margin: 'auto' }}>
          <Paper>
            <div style={{ display: 'flex', height: 150, flexDirection: 'row', paddingLeft: 30, paddingRight: 40, alignItems: 'center' }} >
              <h3>List of Nodes</h3>
              <div style={{ display: 'flex', height: 56, flex: 1, justifyContent: 'flex-end', }}>
                <FloatingActionButton onClick={this.handleCreateNodeFromBulkModalOpen}>
                  <ActionNoteAdd name='addBulk' />
                </FloatingActionButton>
                <FloatingActionButton onClick={this.handleCreateNodeModalOpen}>
                  <ContentAdd name='add' />
                </FloatingActionButton>
              </div>
            </div>


            <div style={{ display: 'flex', flexDirection: 'row', paddingRight: 30, paddingLeft: 16 }}>
              <div
                style={{
                  display: 'flex',
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end'
                }}
              >
                {/* <TextField*/}
                {/* onChange={this.onSearchQueryChange.bind(this)}*/}
                {/* floatingLabelText='Search User by E-mail...'*/}
                {/* />*/}
                <div style={{ paddingLeft: 20, width: 40, height: 40 }}>
                  {this.renderSpinner()}
                </div>

              </div>
            </div>
            <div style={{ float: 'clear' }} >
              <div>
                <DropDownMenu
                  value={this.state.c1}
                  onChange={this.handleC1Change}
                  style={{ width: 200 }}
                  autoWidth={false}
                >
                  <MenuItem disabled key={'c1--1'} value={-1} primaryText={'Please select..'} />
                  {
                  Object.keys(this.state.nodeCategory).map(key =>
                    <MenuItem key={`c1-${key}`} value={key} primaryText={`${this.state.nodeCategory[key].name}`} />
                  )
                }
                </DropDownMenu>
                <DropDownMenu
                  value={this.state.c2}
                  onChange={this.handleC2Change}
                  style={{ width: 200 }}
                  autoWidth={false}
                >
                  <MenuItem disabled key={'c2--1'} value={-1} primaryText={'Please select..'} />
                  {
                  this.state.nodeCategory[this.state.c1] ? Object.keys(this.state.nodeCategory[this.state.c1].detail).map(key =>
                    <MenuItem key={`c2-${key}`} value={key} primaryText={`${this.state.nodeCategory[this.state.c1].detail[key].name}`} />
                  ) : null
                }
                </DropDownMenu>
                <FlatButton style={{ height: 50 }}label='Filter' primary />
              </div>

              {/* <DropDownMenu*/}
              {/* value={this.state.c3}*/}
              {/* onChange={this.handleC3Change}*/}
              {/* style={{ width: 200 }}*/}
              {/* autoWidth={false}*/}
              {/* >*/}
              {/* <MenuItem disabled key={'c3-1'} value={-1} primaryText={'Please select..'} />*/}
              {/* {*/}

              {/* this.state.nodeCategory[this.state.c1] ? Object.keys(this.state.nodeCategory[this.state.c1].detail).map(key =>*/}
              {/* <MenuItem key={`c3-${key}`} value={key} primaryText={`${this.state.nodeCategory[this.state.c1].detail[key].name}`} />*/}
              {/* ) : null*/}
              {/* }*/}
              {/* </DropDownMenu>*/}
              <Table
                selectable
                fixedHeader
              >
                <TableHeader>
                  <TableRow>
                    <TableHeaderColumn colSpan='2'>image</TableHeaderColumn>
                    <TableHeaderColumn colSpan='2'>Name</TableHeaderColumn>
                    <TableHeaderColumn colSpan='3'>Address</TableHeaderColumn>
                    <TableHeaderColumn colSpan='3'>Phone</TableHeaderColumn>
                    <TableHeaderColumn colSpan='3'>CreatedAt</TableHeaderColumn>
                    <TableHeaderColumn colSpan='3'>Action</TableHeaderColumn>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {this.state.nodes.map((node) => {
                    const time = node.cAt ? moment(node.cAt).calendar() : 'N/A';
                    return (
                      <TableRow key={node.id}>
                        <TableRowColumn colSpan='2'><img width={50} role='presentation' src={node.imgUrl} /></TableRowColumn>
                        <TableRowColumn colSpan='2'>{node.n}</TableRowColumn>
                        <TableRowColumn colSpan='3'>{node.addr}</TableRowColumn>
                        <TableRowColumn colSpan='3'>{node.p}</TableRowColumn>
                        <TableRowColumn colSpan='3'>{`${time}`}</TableRowColumn>
                        <TableRowColumn colSpan='3'>
                          <Link to={`/node/${node.id}`}>
                            <RaisedButton label='Details' primary />
                          </Link>
                          {/* </RaisedButton>*/}
                        </TableRowColumn>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table></div>

          </Paper>
          <Dialog
            title='Create Node'
            actions={createNodeModalActions}
            modal
            open={this.state.createNodeModalOpen}
            contentStyle={{ width: 400 }}
            onRequestClose={this.handleCreateNodeModalClose}
          >
            <Paper zDepth={0}>
              <TextField
                ref={(ref) => { this.nInput = ref; }}
                hintText='Name'
                style={{ marginLeft: 20 }}
                underlineShow={false}
              />
              <Divider />
              <TextField
                ref={(ref) => { this.addrInput = ref; }}
                hintText='Address'
                style={{ marginLeft: 20 }}
                underlineShow={false}
              />
              <Divider />
              <TextField
                ref={(ref) => { this.pInput = ref; }}
                hintText='phone' style={{
                  marginLeft: 20,
                }} underlineShow={false}
              />
              <TextField
                ref={(ref) => { this.c1Input = ref; }}
                hintText='Category 1' style={{
                  marginLeft: 20,
                }} underlineShow={false}
              />
              <Divider />
              <TextField
                ref={(ref) => { this.c2Input = ref; }}
                hintText='Category 2' style={{
                  marginLeft: 20,
                }} underlineShow={false}
              />
              <Divider />
              <TextField
                ref={(ref) => { this.typeInput = ref; }}
                hintText='Type' style={{
                  marginLeft: 20,
                }} underlineShow={false}
              />
              <Divider />
              <TextField
                ref={(ref) => { this.latInput = ref; }}
                hintText='Lat' style={{
                  marginLeft: 20,
                }} underlineShow={false}
              />
              <Divider />
              <TextField
                ref={(ref) => { this.lonInput = ref; }}
                hintText='Lng' style={{
                  marginLeft: 20,
                }} underlineShow={false}
              />
              <Divider />
            </Paper>
          </Dialog>
          <Dialog
            title='Create Node from bulk'
            actions={createNodeFromBulkModalActions}
            modal
            open={this.state.bulkModalOpen}
            contentStyle={{ width: 400 }}
            onRequestClose={this.handleCreateNodeFromBulkModalClose}
          >
            <Paper zDepth={0}>
              <TextField
                multiLine
                rowsMax={5}
                ref={(ref) => { this.bulkInput = ref; }}
                hintText='bulk text'
                style={{ marginLeft: 20 }}
                underlineShow={false}
              />
              <Divider />
            </Paper>
          </Dialog>
        </div>
      </div>
    );
  }
}
