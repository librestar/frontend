import React, { useState, useEffect } from "react";
import { useParams, useHistory, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Badge,
  Button,
  TableBody,
  TableContainer,
  Table,
  TableHeader,
  TableCell,
  TableRow,
} from "@windmill/react-ui";
import ReactLoading from "react-loading";
import {
  ArrowUp,
  ArrowDown,
  Circle,
  CheckCircle,
  WarningCircle,
  User,
  Users,
} from "phosphor-react";

import { getServer } from "../redux/actions/servers";
import { PlusIcon, InfinityIcon } from "../icons";
import { getServerPorts } from "../redux/actions/ports";
import FullScreenLoading from "../components/FullScreenLoading";
import AuthSelector from "../components/AuthSelector";
import PortEditor from "../components/PortEditor";
import PortUserEditor from "../components/PortUserEditor";
import PageTitle from "../components/Typography/PageTitle";
import ForwardRuleEditor from "../components/ForwardRuleEditor";
import UsageCell from "../components/TableCells/UsageCell";
import Tooptip from "../components/Tooltip";

const statusToIcon = (rule) => {
  if (rule) {
    const status = rule.status;
    if (status === "running" || status === "starting") {
      return (
        <ReactLoading
          height={20}
          width={20}
          type="spinningBubbles"
          color="#000"
        />
      );
    } else {
      if (status === "successful")
        return <CheckCircle weight="bold" size={20} />;
      else if (status === "failed")
        return <WarningCircle weight="bold" size={20} />;
    }
  } else return <Circle weight="bold" size={20} />;
};
const statusToBadge = (rule, server, port) => {
  const ret = [];
  if (rule) {
    const status = rule.status;
    if (status === "running" || status === "starting") {
      ret.push(<Badge type="warning">部署中</Badge>);
      ret.push(
        <Link
          className="text-blue-600"
          to={`/app/servers/${server.id}/${port.id}/artifacts`}
        >
          查看日志
        </Link>
      );
    } else {
      if (status === "successful") {
        ret.push(<Badge type="success">端口功能已部署</Badge>);
        if (rule.method === "iptables") {
          ret.push(
            <span>{`[${rule.config.type}] ${rule.config.remote_address}:${rule.config.remote_port}`}</span>
          );
        } else if (rule.method === "gost") {
          ret.push(
            `gost${rule.config.ServeNodes.map((n) => "\n-L " + n).join(
              ""
            )}${rule.config.ChainNodes.map((n) => "\n-F " + n).join("")}`
          );
        } else if (rule.method === "brook") {
          ret.push(`brook ${rule.config.command}`);
        } else if (rule.method === "tiny_port_mapper") {
          ret.push(
            `tinyPortMapper -l0.0.0.0:${
              port.external_num ? port.external_num : port.num
            } -r${rule.config.remote_address}:${rule.config.remote_port}`
          );
        } else if (rule.method === "node_exporter") {
          ret.push("node_exporter");
          ret.push(
            `请添加${server.address}:${
              port.external_num ? port.external_num : port.num
            }到promethus.yml中`
          );
        } else {
          ret.push(rule.method);
        }
      } else if (status === "failed") {
        ret.push(<Badge type="danger">端口功能部署失败</Badge>);
        ret.push(
          <Link
            className="text-blue-600"
            to={`/app/servers/${server.id}/${port.id}/artifacts`}
          >
            查看日志
          </Link>
        );
        if (rule.config && rule.config.error) {
          ret.push(`\n${rule.config.error}`);
        }
      }
    }
  }
  return (
    <>
      {ret.map((c, idx) => (
        <div key={`forward_status_badge_${idx}`}>{c}</div>
      ))}
    </>
  );
};

const usersToBadge = (users) => {
  if (users.length > 0) {
    return (
      <>
        <Badge type="success">有{`${users.length}`}人正在使用此端口</Badge>
        {users.map((u) => (
          <span key={`server_users_badge_${u.user_id}`}>{u.user.email}</span>
        ))}
      </>
    );
  }
  return <Badge type="warning">此端口无人使用</Badge>;
};

const formatSpeed = (speed) => {
  speed = parseInt(speed, 10);
  if (speed % 1000000 === 0) {
    return speed / 1000000 + "Gb/s";
  } else if (speed % 1000 === 0) {
    return speed / 1000 + "Mb/s";
  } else {
    return speed + "kb/s";
  }
};

function Server() {
  const server_id = parseInt(useParams().server_id);
  const servers = useSelector((state) => state.servers.servers);
  const ports = useSelector((state) => state.ports.ports);
  const permission = useSelector((state) => state.auth.permission);
  const dispatch = useDispatch();
  const history = useHistory();
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState("");
  const [currentPort, setCurrentPort] = useState("");
  const [portEditorOpen, setPortEditorOpen] = useState(false);
  const [portUserEditorOpen, setPortUserEditorOpen] = useState(false);
  const [showUsers, setShowUsers] = useState({});

  useEffect(() => {
    dispatch(getServerPorts(server_id));
    if (!(server_id in servers)) {
      dispatch(getServer(server_id));
    }
  }, [dispatch, server_id, servers]);

  if (!servers[server_id]) return <FullScreenLoading />;
  return (
    <>
      <PageTitle>
        <div className="flex flex-row justify-start space-x-2">
          <span>
            {servers[server_id].name}[{servers[server_id].address}]
          </span>
          <AuthSelector permissions={["admin"]}>
            <Button
              iconLeft={Users}
              size="small"
              layout="outline"
              onClick={(e) => history.push(`/app/servers/${server_id}/users`)}
            ></Button>
          </AuthSelector>
        </div>
      </PageTitle>

      <ForwardRuleEditor
        forwardRule={currentRule}
        serverId={server_id}
        port={currentPort}
        isModalOpen={ruleEditorOpen}
        setIsModalOpen={setRuleEditorOpen}
      />
      <PortEditor
        port={currentPort}
        serverId={server_id}
        isModalOpen={portEditorOpen}
        setIsModalOpen={setPortEditorOpen}
      />
      <AuthSelector permissions={["admin"]}>
        <PortUserEditor
          portId={currentPort.id}
          serverId={server_id}
          isModalOpen={portUserEditorOpen}
          setIsModalOpen={setPortUserEditorOpen}
        />
      </AuthSelector>
      <div className="flex justify-between items-center">
        <PageTitle>端口</PageTitle>
        <AuthSelector permissions={["admin"]}>
          <Button
            size="regular"
            iconLeft={PlusIcon}
            onClick={() => {
              setCurrentPort("");
              setPortEditorOpen(true);
            }}
          >
            添加端口
          </Button>
        </AuthSelector>
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <TableCell>端口号</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>功能</TableCell>
              <TableCell>限速</TableCell>
              <TableCell>流量</TableCell>
              <TableCell>用户</TableCell>
              <TableCell>动作</TableCell>
            </tr>
          </TableHeader>
          <TableBody>
            {Object.keys(ports).map(
              (port_id) =>
                ports[port_id] && (
                  <TableRow key={`servers_server_${server_id}_${port_id}`}>
                    <TableCell>
                      <div className="flex flex-row items-center">
                        <AuthSelector permissions={["admin"]}>
                          {ports[port_id].external_num
                            ? ports[port_id].external_num
                            : ports[port_id].num}
                          {ports[port_id].external_num ? (
                            <Tooptip
                              tip={
                                <span>
                                  <Badge>内部端口</Badge>
                                  {ports[port_id].num}
                                </span>
                              }
                            >
                              <WarningCircle weight="bold" size={20} />
                            </Tooptip>
                          ) : null}
                        </AuthSelector>
                        <AuthSelector permissions={["user"]}>
                          {ports[port_id].external_num
                            ? ports[port_id].external_num
                            : ports[port_id].num}
                        </AuthSelector>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ports[port_id].notes ? (
                        ports[port_id].notes.length > 10 ? (
                          <Tooptip tip={ports[port_id].notes}>
                            {`${ports[port_id].notes.slice(0, 10)}...`}
                          </Tooptip>
                        ) : (
                          ports[port_id].notes
                        )
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Tooptip
                        tip={statusToBadge(
                          ports[port_id].forward_rule,
                          servers[server_id],
                          ports[port_id]
                        )}
                      >
                        {statusToIcon(ports[port_id].forward_rule)}
                      </Tooptip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col justify-center">
                        {ports[port_id].config &&
                        (ports[port_id].config.egress_limit ||
                          ports[port_id].ingress_limit) ? (
                          <>
                            {ports[port_id].config.ingress_limit ? (
                              <span className="flex flex-auto items-center">
                                <ArrowUp size={16} />
                                {formatSpeed(
                                  ports[port_id].config.ingress_limit
                                )}
                              </span>
                            ) : null}
                            {ports[port_id].config.egress_limit ? (
                              <span className="flex flex-auto items-center">
                                <ArrowDown size={16} />
                                {formatSpeed(
                                  ports[port_id].config.egress_limit
                                )}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <InfinityIcon weight="bold" size={24} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <UsageCell usage={ports[port_id].usage} />
                    </TableCell>
                    <TableCell>
                      <div className="relative z-20 inline-flex">
                        <div
                          onMouseEnter={() => setShowUsers({ [port_id]: true })}
                          onMouseLeave={() =>
                            setShowUsers({ [port_id]: false })
                          }
                        >
                          {ports[port_id].allowed_users &&
                          ports[port_id].allowed_users.length > 0 ? (
                            ports[port_id].allowed_users.length > 1 ? (
                              <Users weight="bold" size={20} />
                            ) : (
                              <User weight="bold" size={20} />
                            )
                          ) : (
                            <Circle weight="bold" size={20} />
                          )}
                        </div>
                        {showUsers[port_id] ? (
                          <div className="relative">
                            <div className="absolute flex flex-col top-0 z-30 w-auto p-2 -mt-1 text-sm leading-tight text-black transform -translate-x-1/2 -translate-y-full bg-white rounded-lg shadow-lg">
                              {usersToBadge(ports[port_id].allowed_users)}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col flex-wrap lg:flex-row lg:items-end lg:space-x-1 space-y-1">
                        <AuthSelector permissions={["admin"]}>
                          <Button
                            size="small"
                            onClick={() => {
                              setCurrentPort(ports[port_id]);
                              setPortUserEditorOpen(true);
                            }}
                          >
                            查看用户
                          </Button>
                        </AuthSelector>
                        <Button
                          size="small"
                          onClick={() => {
                            setCurrentPort(ports[port_id]);
                            setPortEditorOpen(true);
                          }}
                        >
                          修改端口
                        </Button>
                        {ports[port_id].forward_rule ? (
                          <>
                            <Button
                              size="small"
                              onClick={() => {
                                setCurrentRule(ports[port_id].forward_rule);
                                setCurrentPort(ports[port_id]);
                                setRuleEditorOpen(true);
                              }}
                              disabled={
                                ((!ports[port_id].forward_rule.count ||
                                  ports[port_id].forward_rule.count <= 10) &&
                                  (ports[port_id].forward_rule.status ===
                                    "starting" ||
                                    ports[port_id].forward_rule.status ===
                                      "running")) ||
                                (ports[port_id].forward_rule.method ===
                                  "caddy" &&
                                  permission === "user")
                              }
                            >
                              修改转发
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="small"
                            onClick={() => {
                              setCurrentRule(null);
                              setCurrentPort(ports[port_id]);
                              setRuleEditorOpen(true);
                            }}
                          >
                            添加转发
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="h-3" />
    </>
  );
}

export default Server;
