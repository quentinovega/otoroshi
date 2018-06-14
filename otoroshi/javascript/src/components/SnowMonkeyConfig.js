import React, { Component } from 'react';

import { ChaosConfig } from './ChaosConfig';

import { ArrayInput, BooleanInput, NumberInput, SelectInput, TextInput } from './inputs';

export class SnowMonkeyConfig extends Component {
  state = {
    config: this.props.config,
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.config !== this.props.config) {
      this.setState({ config: nextProps.config });
    }
  }

  changeTheValue = (name, value) => {
    const newConfig = { ...this.state.config, [name]: value };
    this.setState(
      {
        config: newConfig,
      },
      () => {
        this.props.onChange(this.state.config);
      }
    );
  };

  render() {
    if (!this.state.config) return null;
    return [
      <form className="form-horizontal" style={{ marginRight: 15 }}>
        <NumberInput
          suffix="times"
          label="Outages per day"
          help="How many outage per work day"
          value={this.state.config.timesPerDay}
          onChange={v => this.changeTheValue('timesPerDay', v)}
        />
        <BooleanInput
          label="Include user facing apps."
          value={this.state.config.includeUserFacingDescriptors}
          help="..."
          onChange={v => this.changeTheValue('includeUserFacingDescriptors', v)}
        />
        <SelectInput
          label="Outage strategy"
          placeholder="The strategy used for outage creattion"
          value={this.state.config.outageStrategy}
          onChange={e => this.changeTheValue('outageStrategy', e)}
          help="..."
          possibleValues={['OneServicePerGroup', 'AllServicesPerGroup']}
          transformer={v => ({ value: v, label: v })}
        />
        <TextInput
          label="Start time"
          placeholder="Outage period start in the work day"
          value={this.state.config.startTime}
          help="..."
          onChange={e => this.changeTheValue('startTime', e)}
        />
        <TextInput
          label="Stop time"
          placeholder="Outage period stio in the work day"
          value={this.state.config.stopTime}
          help="..."
          onChange={e => this.changeTheValue('stopTime', e)}
        />
        <NumberInput
          suffix=".ms"
          label="Outage duration (from)"
          placeholder="Outage duration range start"
          value={this.state.config.outageDurationFrom}
          help="..."
          onChange={e => this.changeTheValue('outageDurationFrom', e)}
        />
        <NumberInput
          suffix=".ms"
          label="Outage duration (to)"
          placeholder="Outage duration range stop"
          value={this.state.config.outageDurationTo}
          help="..."
          onChange={e => this.changeTheValue('outageDurationTo', e)}
        />
        <ArrayInput
          label="Impacted groups"
          placeholder="Groups"
          value={this.state.config.targetGroups}
          valuesFrom="/bo/api/proxy/api/groups"
          transformer={a => ({ value: a.id, label: a.name })}
          help="..."
          onChange={e => this.changeTheValue('targetGroups', e)}
        />
{/*new skin begin */}
<div className="row">
      <div className="col-xs-12 col-sm-3">
        <div className="panel panel-primary">
          <div className="panel-heading">Large Resquest Fault</div>
          <div className="panel-body">
            <div className="form-group">
              <div className="col-xs-12">
                <label for="input-Ratio" class="control-label">Ratio
                  <i class="fa fa-question-circle-o" data-toggle="tooltip" data-placement="top" title="" data-original-title="..."></i>
                </label>
                <input type="number" step="0.1" min="0" max="1" class="form-control" id="input-Ratio" value="0.2"/>
              </div>
            </div>
            <div className="form-group">
              <div className="col-xs-12">
                <label for="input-Additional size" className="control-label">Additional size
                <i className="fa fa-question-circle-o" data-toggle="tooltip" data-placement="top" title="" data-original-title="..."></i>
                </label>
                <div className="input-group">
                  <input type="number" class="form-control" id="input-Additional size" value="0"/>
                  <div className="input-group-addon">byt.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-xs-12 col-sm-3">
        <div className="panel panel-primary">
          <div className="panel-heading">Large Resquest Fault 2</div>
          <div className="panel-body">
            <div className="form-group">
              <div className="col-xs-12">
                <label for="input-Ratio" class="">Zone texte
                  <i class="fa fa-question-circle-o" data-toggle="tooltip" data-placement="top" title="" data-original-title="..."></i>
                </label>
                <textarea className="form-control"></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-xs-12 col-sm-3">
        <div className="panel panel-primary">
          <div className="panel-heading">Large Resquest Fault 3</div>
          <div className="panel-body">
            <div className="form-group">
            <div className="col-xs-12">
              <label for="input-Ratio" class="control-label">Ratio
                <i class="fa fa-question-circle-o" data-toggle="tooltip" data-placement="top" title="" data-original-title="..."></i>
              </label>
              <input type="number" step="0.1" min="0" max="1" class="form-control" id="input-Ratio" value="0.2"/>
            </div>
            </div>
            <div className="form-group">
              <label for="input-Ratio" className="col-xs-12">Headers
                <i className="fa fa-question-circle-o" data-toggle="tooltip" data-placement="top" title="" data-original-title="..."></i>
                <button type="button" className="btn btn-primary btn-xs pull-right"><i className="glyphicon glyphicon-plus-sign"></i> </button>
              </label>
              <div className="col-sm-offset-1 col-sm-11">
                  <label for="input-Ratio" style={{marginBottom:0,color: '#cccccc'}}>Key</label>
                  <input type="number" step="0.1" min="0" max="1" className="form-control" id="input-Ratio"  placeholder= "Content-Type" value="0.2"/>
              </div>
              <div className="col-sm-offset-1 col-sm-11">
                <label for="input-Ratio" style={{marginBottom:0,color: '#cccccc'}}>Value</label>
                <input type="number" step="0.1" min="0" max="1" className="form-control" id="input-Ratio" placeholder= "application/json" value="0.2"/>
              </div>
              <div className="col-sm-offset-1 col-sm-11">
                <button type="button" className="btn btn-danger btn-block btn-xs" style={{marginBottom:20,marginTop:10}}><i className="glyphicon glyphicon-trash"></i></button>
              </div>
              <div className="col-sm-offset-1 col-sm-11">
                  <label for="input-Ratio" style={{marginBottom:0,color: '#cccccc'}}>Key</label>
                  <input type="number" step="0.1" min="0" max="1" className="form-control" id="input-Ratio" placeholder= "Content-Type" value=""/>
              </div>
              <div className="col-sm-offset-1 col-sm-11">
                <label for="input-Ratio" style={{marginBottom:0,color: '#cccccc'}}>Value</label>
                  <input type="number" step="0.1" min="0" max="1" className="form-control" id="input-Ratio" placeholder= "application/json" value=""/>
              </div>
              <div className="col-sm-offset-1 col-sm-11">
                <button type="button" className="btn btn-danger btn-block btn-xs" style={{marginBottom:20,marginTop:10}}><i className="glyphicon glyphicon-trash"></i></button>
              </div>
            </div>
            </div>
        </div>
      </div>
      <div className="col-xs-12 col-sm-3">
        <div className="panel panel-primary">
          <div className="panel-heading">Large Resquest Fault 4</div>
          <div className="panel-body">Panel Content</div>
        </div>
      </div>

</div>
{/*new skin end */}
        <ChaosConfig
          hideLargeStuff={true}
          config={this.state.config.chaosConfig}
          onChange={c => {
            this.setState({ config: { ...this.state.config, chaosConfig: c } }, () => {
              this.props.onChange(this.state.config);
            });
          }}
        />
      </form>,
    ];
  }
}
